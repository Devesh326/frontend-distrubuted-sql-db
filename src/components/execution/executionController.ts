import type { ExecutionStep, HistoryEntry, QueryType, WsEvent } from '@/types'

interface QueryResponse {
  rows: Record<string, string>[]
  duration_ms: number
  query_type: string
  coordinator_id?: string
  events?: WsEvent[]
  events_truncated?: boolean
  error?: string
}
interface State {
  isExecuting: boolean
  currentQueryType: QueryType | null
  executionSteps: ExecutionStep[]
  currentStepIndex: number
  packetTarget: string | null
  highlightedNode: string | null
  executionProgress: number
  completionPhase: 'none' | 'complete' | 'fading' | 'ready'
  queryResult: Record<string, string>[] | null
  queryError: string | null
  lastQueryDurationMs: number
  lastTraceId: string | null
  queryHistory: HistoryEntry[]
  simulationSpeed: number
  cameraTargetNode: string | null
  executionPhase: 'idle' | 'waiting' | 'replaying'
  executionCoordinatorId: string | null
  executionNotice: string | null
}
interface Dependencies {
  getState: () => State
  setState: (state: Partial<State>) => void
  executeQuery: (query: string, trace: string) => Promise<QueryResponse>
  delay?: (ms: number) => Promise<void>
}
export function classifyQueryType(query: string): QueryType {
  if (/^SELECT\s+.*\bCOUNT\s*\(/i.test(query.trim())) return 'COUNT'
  if (/^SELECT\s+.*\bJOIN\b/i.test(query.trim())) return 'JOIN'
  if (/^INSERT\b/i.test(query.trim())) return 'INSERT'
  if (/^UPDATE\b/i.test(query.trim())) return 'UPDATE'
  if (/^DELETE\b/i.test(query.trim())) return 'DELETE'
  return 'SELECT'
}
const labels: Record<string, string> = {
  'query.submitted': 'Backend received query',
  'query.parsing': 'Parsing and validating SQL',
  'query.parsed': 'SQL validated',
  'query.planned': 'Routing plan prepared',
  'query.routed': 'Storage target selected',
  'node.executing': 'Storage RPC dispatched',
  'node.completed': 'Storage RPC completed',
  'query.aggregating': 'Combining shard results',
  'query.complete': 'Backend query complete',
}
export function observedSteps(events: WsEvent[] | undefined, trace: string, coordinatorId: string | null): ExecutionStep[] {
  return (Array.isArray(events) ? events : []).filter(event => event && event.trace_id === trace && labels[event.type]).map((event, index) => {
    const target = event.node_id || coordinatorId
    const failed = event.type === 'query.complete' && event.metadata?.error === true
    const shard = event.node_id && event.shard_id !== undefined ? ` · shard ${event.shard_id}` : ''
    return {
      id: `observed-${index}`, label: (failed ? 'Backend query failed' : labels[event.type]) + shard,
      duration: 0, timestamp: event.timestamp, highlightNode: target,
      packetTarget: target, packetLabel: event.node_id ? `${event.node_id}${shard}` : labels[event.type], error: failed,
    }
  })
}
// Playback is a replay of coordinator observations returned with this request.
// It does not simulate Raft packets, infer unseen stages, or change SQL speed.
export function createExecutionController(deps: Dependencies) {
  let generation = 0
  let active = false
  const idle = { isExecuting: false, highlightedNode: null, packetTarget: null, cameraTargetNode: null, executionPhase: 'idle' as const, completionPhase: 'none' as const }
  const abortExecution = () => {
    generation++
    if (active) {
      active = false
      const message = deps.getState().executionPhase === 'replaying'
        ? 'Display replay stopped; the backend response has already arrived.'
        : 'Display cancelled; the backend query may still complete.'
      deps.setState({ ...idle, currentStepIndex: -1, executionProgress: 0, queryError: message })
    }
  }
  const startExecution = async (query: string) => {
    if (active || deps.getState().isExecuting) return
    const run = ++generation
    active = true
    const trace = 'trace-' + globalThis.crypto.randomUUID()
    const type = classifyQueryType(query)
    const submitted: ExecutionStep = { id: 'submitted', label: 'Request submitted; awaiting backend response', duration: 0, highlightNode: null, packetTarget: null, packetLabel: '' }
    deps.setState({ isExecuting: true, executionPhase: 'waiting', executionCoordinatorId: null, executionNotice: null, currentQueryType: type, executionSteps: [submitted], currentStepIndex: 0, packetTarget: null, highlightedNode: null, executionProgress: 0, completionPhase: 'none', queryResult: null, queryError: null, lastQueryDurationMs: 0, lastTraceId: trace })
    let response: QueryResponse | undefined
    let errorMessage: string | null = null
    try {
      try { response = await deps.executeQuery(query, trace) }
      catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error)
        if (error && typeof error === 'object' && 'response' in error) response = (error as { response?: QueryResponse }).response
      }
      if (run !== generation) return
      const coordinatorId = response?.coordinator_id || null
      const observed = observedSteps(response?.events, trace, coordinatorId)
      const terminal: ExecutionStep = { id: 'response', label: errorMessage ? 'Request failed' : 'HTTP response received', duration: 0, highlightNode: null, packetTarget: null, packetLabel: '', error: !!errorMessage }
      const steps = [submitted, ...observed, terminal]
      deps.setState({
        executionSteps: steps, queryError: errorMessage,
        queryResult: errorMessage ? null : response?.rows ?? [],
        lastQueryDurationMs: response?.duration_ms ?? 0,
        executionCoordinatorId: coordinatorId,
        executionPhase: 'replaying',
        executionNotice: response?.events_truncated
          ? 'Partial coordinator event replay; some observations were omitted.'
          : observed.length ? 'Recorded coordinator events (UTC); playback speed changes the display only. Raft replication packets are not traced here.'
          : 'No detailed backend events were returned; only submission and response are shown.',
      })
      if (!errorMessage && response) deps.setState({ queryHistory: [...deps.getState().queryHistory, { id: trace, query, type, timestamp: Date.now(), duration: response.duration_ms, steps, coordinatorId: coordinatorId || undefined }].slice(-100) })
      for (let index = 1; index < steps.length; index++) {
        if (run !== generation) return
        const step = steps[index]
        deps.setState({ currentStepIndex: index, executionProgress: Math.round(index / (steps.length - 1) * 100), highlightedNode: step.highlightNode, packetTarget: step.packetTarget, cameraTargetNode: step.highlightNode })
        const speed = Math.max(0.25, deps.getState().simulationSpeed)
        await (deps.delay ?? (ms => new Promise<void>(resolve => setTimeout(resolve, ms))))(Math.min(220, 4000 / steps.length) / speed)
      }
      if (run === generation) deps.setState({ currentStepIndex: steps.length, executionProgress: 100, completionPhase: 'complete' })
    } finally {
      if (run === generation) { active = false; deps.setState(idle) }
    }
  }
  return { startExecution, abortExecution }
}
