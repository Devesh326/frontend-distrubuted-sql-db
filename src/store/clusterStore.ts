import { create } from 'zustand'
import * as api from '@/services/api'
import { createSnapshotPoller } from '@/services/snapshotPoller'
import { appendSample, isFresh } from '@/services/metricsData'
import type {
  ClusterState, Metrics, SidebarView, LogEntry, SettingsState,
  QueryType, ExecutionStep, HistoryEntry, QueuedQuery, WsEvent,
  MetricSample, ConnectionStatus, RecoverySnapshot,
} from '@/types'

interface NodeEventEntry {
  id: string
  timestamp: string
  type: string
  message: string
}

interface ClusterStore {
 controlToken: string
 setControlToken: (token: string) => void
 powerPending: Record<string, boolean>
 powerErrors: Record<string, string>
 setNodePower: (id: string, action: 'start' | 'stop') => Promise<void>
  cluster: ClusterState
  metrics: Metrics
  metricHistory: MetricSample[]
  connectionStatus: ConnectionStatus
  connectionError: string | null
  snapshotObservedAt: number
  stoppingNodes: Record<string, boolean>
  stopErrors: Record<string, string>
  checkFreshness: () => void
  stopPolling: () => void
  recovery: RecoverySnapshot | null
  recoveryStatus: ConnectionStatus
  recoveryError: string | null
  recoveryReceivedAt: number
  refreshRecovery: (force?: boolean) => Promise<void>
  sidebarView: SidebarView
  setSidebarView: (view: SidebarView) => void

  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  drawerOpen: boolean
  drawerSession: number
  setDrawerOpen: (open: boolean) => void
  drawerType: 'node' | 'coordinator' | 'metadata' | null
  setDrawerType: (type: 'node' | 'coordinator' | 'metadata' | null) => void

  metricModalKey: string | null
  setMetricModalKey: (key: string | null) => void

  logs: LogEntry[]
  addLog: (entry: LogEntry) => void
  clearLogs: () => void
  logPaused: boolean
  setLogPaused: (paused: boolean) => void

  settings: SettingsState
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void

  playgroundQuery: string
  setPlaygroundQuery: (q: string) => void

  cameraTargetNode: string | null
  setCameraTargetNode: (id: string | null) => void

  isExecuting: boolean
  setIsExecuting: (exec: boolean) => void
  currentQueryType: QueryType | null
  setCurrentQueryType: (type: QueryType | null) => void
  currentStepIndex: number
  setCurrentStepIndex: (i: number) => void
  executionSteps: ExecutionStep[]
  setExecutionSteps: (steps: ExecutionStep[]) => void
  packetTarget: string | null
  setPacketTarget: (target: string | null) => void
  highlightedNode: string | null
  setHighlightedNode: (node: string | null) => void
  queryHistory: HistoryEntry[]
  addHistory: (entry: HistoryEntry) => void
  executionQueue: QueuedQuery[]
  setExecutionQueue: (q: QueuedQuery[]) => void
  simulationSpeed: number
  setSimulationSpeed: (speed: number) => void
  executionProgress: number
  setExecutionProgress: (progress: number) => void
  completionPhase: 'none' | 'complete' | 'fading' | 'ready'
  setCompletionPhase: (phase: 'none' | 'complete' | 'fading' | 'ready') => void
  cinematicMode: boolean
  setCinematicMode: (on: boolean) => void

  queryResult: Record<string, string>[] | null
  queryError: string | null
  setQueryResult: (rows: Record<string, string>[] | null) => void
  lastQueryDurationMs: number
  setLastQueryDurationMs: (ms: number) => void
  lastTraceId: string | null
  executionPhase: 'idle' | 'waiting' | 'replaying'
  executionCoordinatorId: string | null
  executionNotice: string | null
  setLastTraceId: (id: string | null) => void

  nodeEventLog: Record<string, NodeEventEntry[]>
  lastPollTimestamp: number

  processEvent: (evt: WsEvent) => void
  init: () => Promise<void>
  refreshCluster: () => Promise<void>
  refreshMetrics: () => Promise<void>
  stopNode: (nodeId: string) => Promise<void>
}

const defaultSettings: SettingsState = {
  animationSpeed: 1, packetAnimation: true, gridVisibility: true, leaderHighlight: true, autoLayout: false,
}

const defaultCluster: ClusterState = {
  coordinator: { id: '', name: 'Coordinator unavailable', address: '', port: 0, healthy: false },
  coordinators: [],
  nodes: [],
  shards: [],
  shardRaftDetail: [],
  metadataCluster: null,
  buckets: 0,
}

const defaultMetrics: Metrics = {
  queryCount: null, averageLatency: null, clusterHealth: null, nodesAlive: 0, nodesTotal: 0, shardCount: 0, coordinatorId: '',
}

let logCounter = 0
function makeLog(message: string, level: LogEntry['level'] = 'info'): LogEntry {
  logCounter++
  const d = new Date()
  const ts = d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0')
  return { id: String(logCounter), timestamp: ts, message, level }
}

let eventIdCounter = 0

function pushNodeEvent(nodeId: string, evt: WsEvent, existing: Record<string, NodeEventEntry[]>): Record<string, NodeEventEntry[]> {
  eventIdCounter++
  const entry: NodeEventEntry = {
    id: `evt-${eventIdCounter}`,
    timestamp: evt.timestamp || new Date().toISOString(),
    type: evt.type,
    message: evt.sql || evt.type,
  }
  const log = existing[nodeId] || []
  const updated = [...log, entry].slice(-20)
  return { ...existing, [nodeId]: updated }
}

export const useClusterStore = create<ClusterStore>((set, get) => ({
  controlToken: '', setControlToken: token => set({controlToken: token}),
  powerPending: {}, powerErrors: {},
  setNodePower: async (id, action) => {
   const state = get()
   if (state.powerPending[id]) return
   const blocked = !state.controlToken ? 'Enter the lab control token before sending a power command. No command was sent.' : state.recoveryStatus !== 'connected' ? 'Controller status is unavailable. No command was sent.' : !state.recovery?.experiments_enabled ? 'Power experiments are disabled. No command was sent.' : ''
   if (blocked) { set(state => ({powerErrors: {...state.powerErrors, [id]: blocked}})); return }
   set(state => ({powerPending: {...state.powerPending, [id]: true}, powerErrors: {...state.powerErrors, [id]: ''}}))
   try {
    await api.setNodePower(id, action, state.controlToken)
    get().addLog(makeLog(`${id}: ${action} acknowledged; waiting for observed state.`, 'warn'))
   } catch (error) {
    set(state => ({powerErrors: {...state.powerErrors, [id]: error instanceof Error ? error.message : String(error)}}))
   } finally {
    await Promise.all([get().refreshRecovery(true), get().refreshCluster()])
    set(state => ({powerPending: {...state.powerPending, [id]: false}}))
   }
  },
  cluster: defaultCluster,
  metrics: defaultMetrics,
  metricHistory: [],
  connectionStatus: 'loading',
  connectionError: null,
  snapshotObservedAt: 0,
  stoppingNodes: {},
  stopErrors: {},
  recovery: null, recoveryStatus: 'loading', recoveryError: null, recoveryReceivedAt: 0,
  refreshRecovery: (force = false) => { if (force) recoveryPoller.invalidate(); return recoveryPoller.refresh() },
  stopPolling: () => { snapshotPoller.invalidate(); recoveryPoller.invalidate() },
  checkFreshness: () => {
    const state = get()
    if (state.lastPollTimestamp && !isFresh(state.snapshotObservedAt, state.lastPollTimestamp, Date.now()) && state.connectionStatus !== 'stale') set({ connectionStatus: 'stale' })
    if (state.recoveryReceivedAt && Date.now() - state.recoveryReceivedAt > 6000 && state.recoveryStatus !== 'stale') set({ recoveryStatus: 'stale' })
  },
  sidebarView: 'cluster',
  setSidebarView: (view) => set({ sidebarView: view }),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  drawerOpen: false,
  drawerSession: 0,
  setDrawerOpen: (open) => set(state => ({ drawerOpen: open, drawerSession: open ? state.drawerSession : state.drawerSession + 1 })),
  drawerType: null,
  setDrawerType: (type) => set({ drawerType: type }),

  metricModalKey: null,
  setMetricModalKey: (key) => set({ metricModalKey: key }),

  logs: [],
  addLog: (entry) => set((state) => ({ logs: [...state.logs, entry].slice(-1000) })),
  clearLogs: () => set({ logs: [] }),
  logPaused: false,
  setLogPaused: (paused) => set({ logPaused: paused }),

  settings: defaultSettings,
  updateSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),

  playgroundQuery: 'SELECT * FROM users;',
  setPlaygroundQuery: (q) => set({ playgroundQuery: q }),

  cameraTargetNode: null,
  setCameraTargetNode: (id) => set({ cameraTargetNode: id }),

  isExecuting: false,
  setIsExecuting: (exec) => set({ isExecuting: exec }),
  currentQueryType: null,
  setCurrentQueryType: (type) => set({ currentQueryType: type }),
  currentStepIndex: -1,
  setCurrentStepIndex: (i) => set({ currentStepIndex: i }),
  executionSteps: [],
  setExecutionSteps: (steps) => set({ executionSteps: steps }),
  packetTarget: null,
  setPacketTarget: (target) => set({ packetTarget: target }),
  highlightedNode: null,
  setHighlightedNode: (node) => set({ highlightedNode: node }),
  queryHistory: [],
  addHistory: (entry) => set((state) => ({ queryHistory: [...state.queryHistory, entry] })),
  executionQueue: [],
  setExecutionQueue: (q) => set({ executionQueue: q }),
  simulationSpeed: 1,
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),
  executionProgress: 0,
  setExecutionProgress: (progress) => set({ executionProgress: progress }),
  completionPhase: 'none',
  setCompletionPhase: (phase) => set({ completionPhase: phase }),
  cinematicMode: false,
  setCinematicMode: (on) => set({ cinematicMode: on }),

  queryResult: null,
  queryError: null,
  setQueryResult: (rows) => set({ queryResult: rows }),
  lastQueryDurationMs: 0,
  setLastQueryDurationMs: (ms) => set({ lastQueryDurationMs: ms }),
  lastTraceId: null,
  executionPhase: 'idle',
  executionCoordinatorId: null,
  executionNotice: null,
  setLastTraceId: (id) => set({ lastTraceId: id }),

  nodeEventLog: {},
  lastPollTimestamp: 0,

  processEvent: (evt: WsEvent) => {
    const state = get()

    // Always log
    if (!state.logPaused) {
      const level: LogEntry['level'] =
        evt.type.includes('error') || evt.type.includes('dead') || evt.metadata?.error === true ? 'error' :
        evt.type.includes('start') || evt.type.includes('elected') ? 'warn' : 'info'
      const detail = evt.type === 'raft.leader.observed'
        ? `shard ${evt.shard_id}: ${evt.metadata?.previous_leader || 'unknown'} → ${evt.metadata?.leader || 'not observed'} · term ${evt.metadata?.term || '?'} (storage reports)`
        : evt.type === 'shard.routing.changed' ? `shard ${evt.shard_id}: metadata route → ${evt.node_id}` : evt.sql || ''
      state.addLog(makeLog(`[${evt.type}] ${evt.node_id || evt.trace_id || ''} ${detail}`, level))
    }

    // Events are observations from one coordinator, not an authoritative snapshot.
    if (evt.node_id) {
      const nodeEventLog = pushNodeEvent(evt.node_id, evt, state.nodeEventLog)
      set({ nodeEventLog })
    }

    /* Snapshot polling below owns health/topology updates. */
    if (evt.type.startsWith('node.') || evt.type.startsWith('raft.') || evt.type.startsWith('shard.')) void get().refreshCluster()

  },

  init: () => snapshotPoller.refresh(),
  refreshCluster: () => snapshotPoller.refresh(),
  refreshMetrics: () => snapshotPoller.refresh(),

  stopNode: async (nodeId: string) => {
    if (get().connectionStatus !== 'connected' || get().stoppingNodes[nodeId]) return
    set(state => ({ stoppingNodes: { ...state.stoppingNodes, [nodeId]: true }, stopErrors: { ...state.stopErrors, [nodeId]: '' } }))
    try {
      await api.stopNode(nodeId)
      get().addLog(makeLog(`Shutdown request accepted for ${nodeId}; waiting for reported node health.`, 'warn'))
      await get().refreshCluster()
    } catch (err) {
      set(state => ({ stopErrors: { ...state.stopErrors, [nodeId]: err instanceof Error ? err.message : String(err) } }))
      get().addLog(makeLog(`Failed to stop node ${nodeId}: ${err}`, 'error'))
    } finally {
      set(state => ({ stoppingNodes: { ...state.stoppingNodes, [nodeId]: false } }))
    }
  },
}))

const snapshotPoller = createSnapshotPoller({
  fetch: api.getSnapshot,
  apply: snapshot => useClusterStore.setState(state => ({
    cluster: snapshot.cluster, metrics: snapshot.metrics,
    metricHistory: appendSample(state.metricHistory, snapshot.metrics, Date.now()),
    snapshotObservedAt: snapshot.observedAt, lastPollTimestamp: Date.now(),
    connectionStatus: 'connected', connectionError: null,
  })),
  failed: error => useClusterStore.setState(state => ({
    connectionStatus: state.lastPollTimestamp ? 'stale' : 'unavailable',
    connectionError: error instanceof Error ? error.message : String(error),
  })),
})

const recoveryPoller = createSnapshotPoller({
  fetch: api.getRecoverySnapshot,
  apply: recovery => useClusterStore.setState({ recovery, recoveryStatus: 'connected', recoveryError: null, recoveryReceivedAt: Date.now() }),
  failed: error => useClusterStore.setState(state => ({ recoveryStatus: state.recovery ? 'stale' : 'unavailable', recoveryError: error instanceof Error ? error.message : String(error) })),
})
