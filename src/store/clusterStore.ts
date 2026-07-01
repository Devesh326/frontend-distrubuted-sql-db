import { create } from 'zustand'
import type {
  ClusterState, Metrics, SidebarView, LogEntry, SettingsState,
  QueryType, ExecutionStep, HistoryEntry, QueuedQuery
} from '@/types'

interface ClusterStore {
  cluster: ClusterState
  metrics: Metrics
  sidebarView: SidebarView
  setSidebarView: (view: SidebarView) => void

  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  drawerType: 'node' | 'coordinator' | null
  setDrawerType: (type: 'node' | 'coordinator' | null) => void

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
}

const mockCluster: ClusterState = {
  coordinator: { id: 'coord-1', name: 'Coordinator', port: 26257, health: 'healthy' },
  nodes: [
    { id: 'node-1', name: 'Neon-1', role: 'leader', port: 26258, cpu: 42, memory: 68, storage: 55, shardCount: 24, health: 'healthy', isLeader: true },
    { id: 'node-2', name: 'Neon-2', role: 'replica', port: 26259, cpu: 38, memory: 45, storage: 52, shardCount: 18, health: 'healthy', isLeader: false },
    { id: 'node-3', name: 'Neon-3', role: 'replica', port: 26260, cpu: 55, memory: 72, storage: 48, shardCount: 20, health: 'healthy', isLeader: false },
  ],
  activeLeader: 'node-1',
  replicationFactor: 3,
  totalNodes: 3,
}

const mockMetrics: Metrics = {
  queryCount: 14283, averageLatency: 2.4, clusterHealth: 99.7,
  replicationEvents: 156, activeConnections: 8, errorCount: 3,
}

const initialLogs: LogEntry[] = [
  { id: '1', timestamp: '10:00:00.000', message: 'Cluster initialized with 3 nodes', level: 'info' },
  { id: '2', timestamp: '10:00:00.050', message: 'Leader elected: Neon-1 (node-1)', level: 'info' },
  { id: '3', timestamp: '10:00:00.100', message: 'Replication factor set to 3', level: 'info' },
  { id: '4', timestamp: '10:00:00.150', message: 'Health check passed — all nodes operational', level: 'info' },
  { id: '5', timestamp: '10:00:01.000', message: 'Query received: SELECT * FROM users', level: 'info' },
  { id: '6', timestamp: '10:00:01.010', message: 'Query routed to leader: Neon-1', level: 'debug' },
  { id: '7', timestamp: '10:00:01.050', message: 'Table scan started on shard 4', level: 'debug' },
  { id: '8', timestamp: '10:00:01.100', message: 'Replica Neon-2 synchronized', level: 'info' },
  { id: '9', timestamp: '10:00:01.150', message: 'Replica Neon-3 synchronized', level: 'info' },
  { id: '10', timestamp: '10:00:02.000', message: 'Heartbeat received from Neon-2', level: 'debug' },
  { id: '11', timestamp: '10:00:02.500', message: 'Heartbeat received from Neon-3', level: 'debug' },
  { id: '12', timestamp: '10:00:03.000', message: 'WAL flush completed on leader', level: 'debug' },
]

const defaultSettings: SettingsState = {
  animationSpeed: 1, packetAnimation: true, gridVisibility: true, leaderHighlight: true, autoLayout: false,
}

export const useClusterStore = create<ClusterStore>((set) => ({
  cluster: mockCluster,
  metrics: mockMetrics,
  sidebarView: 'cluster',
  setSidebarView: (view) => set({ sidebarView: view }),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  drawerType: null,
  setDrawerType: (type) => set({ drawerType: type }),

  metricModalKey: null,
  setMetricModalKey: (key) => set({ metricModalKey: key }),

  logs: initialLogs,
  addLog: (entry) => set((state) => ({ logs: [...state.logs, entry] })),
  clearLogs: () => set({ logs: [] }),
  logPaused: false,
  setLogPaused: (paused) => set({ logPaused: paused }),

  settings: defaultSettings,
  updateSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),

  playgroundQuery: '',
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
}))
