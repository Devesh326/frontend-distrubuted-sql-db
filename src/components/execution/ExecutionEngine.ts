import { useCallback, useRef } from 'react'
import { useClusterStore } from '@/store/clusterStore'
import type { QueryType, ExecutionStep, Metrics } from '@/types'

const QUERY_COLORS: Record<QueryType, string> = {
  SELECT: '#22d3ee',
  INSERT: '#34d399',
  UPDATE: '#fbbf24',
  DELETE: '#f472b6',
  COUNT: '#a78bfa',
  JOIN: '#fb923c',
}

let queryIdCounter = 0

function generateQueryId(): string {
  queryIdCounter++
  return `Q-${1042 + queryIdCounter}`
}

function parseQueryType(query: string): QueryType {
  const upper = query.toUpperCase().trim()
  if (/^SELECT\s+.*\bCOUNT\s*\(/i.test(upper)) return 'COUNT'
  if (/^SELECT\s+.*\bJOIN\b/i.test(upper)) return 'JOIN'
  if (/^SELECT\b/.test(upper)) return 'SELECT'
  if (/^INSERT\b/.test(upper)) return 'INSERT'
  if (/^UPDATE\b/.test(upper)) return 'UPDATE'
  if (/^DELETE\b/.test(upper)) return 'DELETE'
  return 'SELECT'
}

const PACKET_LABELS: Record<string, string> = {
  client: 'Client',
  coordinator: 'Coordinator',
  leader: 'Leader',
  replica1: 'Neon-2',
  replica2: 'Neon-3',
}

function getSteps(type: QueryType): ExecutionStep[] {
  const qid = generateQueryId()
  switch (type) {
    case 'SELECT':
      return [
        { id: 'submitted', label: 'Query Submitted', duration: 400, highlightNode: null, packetTarget: 'client', packetLabel: `${type}\n${qid}` },
        { id: 'parsing', label: 'Parsing SQL', duration: 500, highlightNode: 'coordinator', packetTarget: 'coordinator', packetLabel: `${type}\n${qid}` },
        { id: 'routing', label: 'Routing to Leader', duration: 600, highlightNode: null, packetTarget: 'leader', packetLabel: `${type}\n${qid}` },
        { id: 'executing', label: 'Executing on Leader', duration: 800, highlightNode: 'leader', packetTarget: null, packetLabel: '' },
        { id: 'gathering', label: 'Gathering Results', duration: 500, highlightNode: null, packetTarget: 'coordinator', packetLabel: `Results` },
        { id: 'response', label: 'Returning Response', duration: 400, highlightNode: null, packetTarget: 'client', packetLabel: `Done` },
        { id: 'complete', label: 'Query Complete ✓', duration: 300, highlightNode: null, packetTarget: null, packetLabel: '' },
      ]
    case 'INSERT':
    case 'UPDATE':
    case 'DELETE':
      return [
        { id: 'submitted', label: 'Query Submitted', duration: 300, highlightNode: null, packetTarget: 'client', packetLabel: `${type}\n${qid}` },
        { id: 'parsing', label: 'Parsing SQL', duration: 400, highlightNode: 'coordinator', packetTarget: 'coordinator', packetLabel: `${type}\n${qid}` },
        { id: 'routing', label: 'Routing to Leader', duration: 500, highlightNode: null, packetTarget: 'leader', packetLabel: `${type}\n${qid}` },
        { id: 'writing', label: `${type} on Leader`, duration: 700, highlightNode: 'leader', packetTarget: null, packetLabel: '' },
        { id: 'rep1', label: 'Replicating to Neon-2', duration: 400, highlightNode: 'replica1', packetTarget: 'replica1', packetLabel: `Replicate` },
        { id: 'rep2', label: 'Replicating to Neon-3', duration: 400, highlightNode: 'replica2', packetTarget: 'replica2', packetLabel: `Replicate` },
        { id: 'ack', label: 'Receiving ACK', duration: 300, highlightNode: 'leader', packetTarget: 'leader', packetLabel: `ACK` },
        { id: 'response', label: 'Returning Response', duration: 400, highlightNode: null, packetTarget: 'coordinator', packetLabel: `Done` },
        { id: 'complete', label: 'Query Complete ✓', duration: 300, highlightNode: null, packetTarget: null, packetLabel: '' },
      ]
    case 'COUNT':
      return [
        { id: 'submitted', label: 'Query Submitted', duration: 300, highlightNode: null, packetTarget: 'client', packetLabel: `${type}\n${qid}` },
        { id: 'parsing', label: 'Parsing SQL', duration: 400, highlightNode: 'coordinator', packetTarget: 'coordinator', packetLabel: `${type}\n${qid}` },
        { id: 'scatter', label: 'Scattering to All Nodes', duration: 500, highlightNode: null, packetTarget: 'leader', packetLabel: `Scatter` },
        { id: 'node1', label: 'Neon-1 Counting', duration: 500, highlightNode: 'leader', packetTarget: null, packetLabel: '' },
        { id: 'node2', label: 'Neon-2 Counting', duration: 500, highlightNode: 'replica1', packetTarget: null, packetLabel: '' },
        { id: 'node3', label: 'Neon-3 Counting', duration: 500, highlightNode: 'replica2', packetTarget: null, packetLabel: '' },
        { id: 'gather', label: 'Gathering Results', duration: 500, highlightNode: null, packetTarget: 'coordinator', packetLabel: `Results` },
        { id: 'merge', label: 'Merging Results', duration: 400, highlightNode: 'coordinator', packetTarget: null, packetLabel: '' },
        { id: 'response', label: 'Returning Response', duration: 300, highlightNode: null, packetTarget: 'client', packetLabel: `Done` },
        { id: 'complete', label: 'Query Complete ✓', duration: 200, highlightNode: null, packetTarget: null, packetLabel: '' },
      ]
    case 'JOIN':
      return [
        { id: 'submitted', label: 'Query Submitted', duration: 300, highlightNode: null, packetTarget: 'client', packetLabel: `${type}\n${qid}` },
        { id: 'parsing', label: 'Parsing SQL', duration: 400, highlightNode: 'coordinator', packetTarget: 'coordinator', packetLabel: `${type}\n${qid}` },
        { id: 'routing', label: 'Routing to Leader', duration: 500, highlightNode: null, packetTarget: 'leader', packetLabel: `${type}\n${qid}` },
        { id: 'shard1', label: 'Accessing Shard 1', duration: 500, highlightNode: 'leader', packetTarget: null, packetLabel: 'Scan A' },
        { id: 'shard2', label: 'Accessing Shard 2', duration: 500, highlightNode: 'replica1', packetTarget: null, packetLabel: 'Scan B' },
        { id: 'merge', label: 'Merging at Leader', duration: 600, highlightNode: 'leader', packetTarget: 'leader', packetLabel: `Merge` },
        { id: 'response', label: 'Returning Response', duration: 300, highlightNode: null, packetTarget: 'coordinator', packetLabel: `Done` },
        { id: 'complete', label: 'Query Complete ✓', duration: 200, highlightNode: null, packetTarget: null, packetLabel: '' },
      ]
  }
}

export function useExecutionEngine() {
  const abortRef = useRef(false)
  const idRef = useRef(0)

  const parseQuery = useCallback((query: string): QueryType => {
    return parseQueryType(query)
  }, [])

  const startExecution = useCallback(async (query: string) => {
    const type = parseQueryType(query)
    const steps = getSteps(type)
    const execId = ++idRef.current
    abortRef.current = false

    useClusterStore.setState({
      isExecuting: true,
      currentQueryType: type,
      executionSteps: steps,
      currentStepIndex: -1,
      packetTarget: null,
      highlightedNode: null,
      executionProgress: 0,
      completionPhase: 'none',
      cameraTargetNode: null,
    })

    const speed = useClusterStore.getState().simulationSpeed
    const isCinematic = useClusterStore.getState().cinematicMode
    const startTime = Date.now()

    for (let i = 0; i < steps.length; i++) {
      if (abortRef.current || execId !== idRef.current) break

      const step = steps[i]
      const cameraMap: Record<string, string> = {
        coordinator: 'coord-1',
        leader: 'node-1',
        replica1: 'node-2',
        replica2: 'node-3',
      }
      const cameraNodeId = step.highlightNode ? cameraMap[step.highlightNode] || null : null

      useClusterStore.setState({
        currentStepIndex: i,
        highlightedNode: step.highlightNode,
        packetTarget: step.packetTarget,
        executionProgress: Math.round(((i + 1) / steps.length) * 100),
        cameraTargetNode: isCinematic ? cameraNodeId : null,
      })

      const delay = Math.max(50, step.duration / speed)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    if (!abortRef.current && execId === idRef.current) {
      const duration = Date.now() - startTime

      // Phase 1: Hold completion state briefly
      await new Promise((r) => setTimeout(r, Math.max(150, 500 / speed)))

      // Phase 2: Fade highlights and packet
      useClusterStore.setState({ completionPhase: 'fading' })
      useClusterStore.setState({ highlightedNode: null, packetTarget: null })
      await new Promise((r) => setTimeout(r, Math.max(150, 400 / speed)))

      // Phase 3: Restore camera
      useClusterStore.setState({ cameraTargetNode: null })
      await new Promise((r) => setTimeout(r, Math.max(100, 300 / speed)))

      // Phase 4: Final cleanup
      const s = useClusterStore.getState()
      const newMetrics: Metrics = {
        ...s.metrics,
        queryCount: s.metrics.queryCount + 1,
        averageLatency: Math.round((s.metrics.averageLatency * s.metrics.queryCount + duration / 1000) / (s.metrics.queryCount + 1) * 10) / 10,
        replicationEvents: s.metrics.replicationEvents + (type === 'INSERT' || type === 'UPDATE' || type === 'DELETE' ? 2 : 1),
        activeConnections: Math.min(s.metrics.activeConnections + 1, 50),
      }

      useClusterStore.setState({
        metrics: newMetrics,
        isExecuting: false,
        currentStepIndex: -1,
        executionProgress: 0,
        completionPhase: 'none',
        queryHistory: [...s.queryHistory, {
          id: `h-${Date.now()}`,
          query,
          type,
          timestamp: Date.now(),
          duration,
          steps,
        }],
      })
    }
  }, [])

  const abortExecution = useCallback(() => {
    abortRef.current = true
    useClusterStore.setState({
      isExecuting: false,
      currentStepIndex: -1,
      highlightedNode: null,
      packetTarget: null,
      executionProgress: 0,
      completionPhase: 'none',
      cameraTargetNode: null,
    })
  }, [])

  return { startExecution, abortExecution, parseQuery, queryColors: QUERY_COLORS }
}
