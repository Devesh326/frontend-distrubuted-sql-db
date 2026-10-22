import type { ClusterState, ClusterSnapshot, Metrics, Coordinator, StorageNode, MetadataClusterInfo, ShardRaftStatus, NodeRole, WsEvent } from '@/types'
import type { RecoverySnapshot } from '@/types'
import { validateRecovery } from '@/services/recoveryState'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message: string, public response?: ExecuteQueryResponse) { super(message); this.name = 'ApiError' }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  options?.signal?.addEventListener('abort', abort, { once: true })
  if (options?.signal?.aborted) controller.abort()
  const timer = setTimeout(abort, path === '/query' || (path === '/api/recovery/mode' || path === '/api/nodes/power') ? 30_000 : 6_000)
  try {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
    signal: controller.signal,
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    let response: ExecuteQueryResponse | undefined
    try { response = JSON.parse(text) } catch { /* Proxy errors may be plain text. */ }
    throw new ApiError(response?.error || text.slice(0, 2000) || `HTTP ${res.status}`, response)
  }
  return await res.json()
  } catch (error) {
    if (controller.signal.aborted) throw new ApiError(path === '/query' ? 'Request interrupted; the query outcome is unknown. Check before retrying a write.' : (path === '/api/recovery/mode' || path === '/api/nodes/power') ? 'Recovery change was not confirmed. Refresh status before trying again.' : 'Status request interrupted or timed out.')
    throw error
  } finally {
    clearTimeout(timer)
    options?.signal?.removeEventListener('abort', abort)
  }
}

interface ApiCoordinatorInfo {
  id: string; address: string; port: number; healthy: boolean
}

interface ApiNodeStatus {
  id: string; address: string; alive: boolean; is_leader: boolean; shard_count: number
}

interface ApiShardStatus {
  id: number; leader: string; routing_leader?: string; replicas: string[]
}

interface ApiMetricsSummary {
  query_count: number | null; avg_latency_ms: number | null; nodes_alive: number; nodes_total: number; shard_count: number; replication_factor: number
}

interface ApiMetadataNodeInfo {
  id: string; address: string; is_leader: boolean; healthy: boolean
}

interface ApiMetadataClusterInfo {
  nodes: ApiMetadataNodeInfo[]; leader_id: string; current_term: number
}

interface ApiShardReplicaStatus {
  node_id: string; is_leader: boolean; commit_index: number; applied_index: number; term: number
}

interface ApiShardRaftStatus {
  shard_id: number; term: number; replicas: ApiShardReplicaStatus[]
}

interface ApiStatusResponse {
  observed_at: string
  coordinator: ApiCoordinatorInfo
  coordinators: ApiCoordinatorInfo[]
  nodes: ApiNodeStatus[]
  shards: ApiShardStatus[]
  shard_raft_detail: ApiShardRaftStatus[]
  metadata_cluster: ApiMetadataClusterInfo | null
  metrics: ApiMetricsSummary
  buckets: number
}

export async function getStatus(signal?: AbortSignal): Promise<ApiStatusResponse> {
  return apiFetch<ApiStatusResponse>('/status', { signal })
}

function computeShardRoles(nodeId: string, shardRaftDetail: ShardRaftStatus[], shards: ApiShardStatus[]): { shardId: number; role: NodeRole }[] {
  const roles: { shardId: number; role: NodeRole }[] = []
  for (const sr of shardRaftDetail) {
    for (const rep of sr.replicas) {
      if (rep.nodeId === nodeId) {
        roles.push({ shardId: sr.shardId, role: shards.find(shard => shard.id === sr.shardId)?.leader === nodeId ? 'leader' : 'follower' })
      }
    }
  }
  return roles
}

export function clusterFromStatus(data: ApiStatusResponse): ClusterState {

  const coordinators: Coordinator[] = (data.coordinators || []).map((c) => ({
    id: c.id,
    name: `Coordinator ${c.id}`,
    address: c.address,
    port: c.port,
    healthy: c.healthy,
  }))

  const shardRaftDetail: ShardRaftStatus[] = (data.shard_raft_detail || []).map((s) => ({
    shardId: s.shard_id,
    term: s.term,
    replicas: s.replicas.map((r) => ({
      nodeId: r.node_id,
      isLeader: r.is_leader,
      commitIndex: r.commit_index,
      appliedIndex: r.applied_index,
      term: r.term,
    })),
  }))

  const nodes: StorageNode[] = data.nodes.map((n) => {
    const shardRoles = computeShardRoles(n.id, shardRaftDetail, data.shards)
    return {
      id: n.id,
      name: n.id,
      address: n.address,
      port: Number(n.address.slice(n.address.lastIndexOf(':') + 1)) || 0,
      alive: n.alive,
      isLeader: shardRoles.some((r) => r.role === 'leader'),
      shardCount: n.shard_count,
      shardRoles,
    }
  })

  const metadataCluster: MetadataClusterInfo | null = data.metadata_cluster
    ? {
        nodes: data.metadata_cluster.nodes.map((mn) => ({
          id: mn.id,
          address: mn.address,
          isLeader: mn.is_leader,
          healthy: mn.healthy,
        })),
        leaderId: data.metadata_cluster.leader_id,
        currentTerm: data.metadata_cluster.current_term,
      }
    : null

  return {
    coordinator: { ...data.coordinator, name: `Coordinator ${data.coordinator.id}` },
    coordinators,
    nodes,
    shards: data.shards.map((s) => ({ id: s.id, leader: s.leader, routingLeader: s.routing_leader, replicas: s.replicas })),
    shardRaftDetail,
    metadataCluster,
    buckets: data.buckets,
  }
}

export function metricsFromStatus(data: ApiStatusResponse): Metrics {
  return {
    queryCount: data.metrics.query_count,
    averageLatency: data.metrics.avg_latency_ms,
    clusterHealth: data.metrics.nodes_total > 0 ? (data.metrics.nodes_alive / data.metrics.nodes_total) * 100 : null,
    nodesAlive: data.metrics.nodes_alive,
    nodesTotal: data.metrics.nodes_total,
    shardCount: data.metrics.shard_count,
    coordinatorId: data.coordinator.id,
  }
}

export async function getSnapshot(signal?: AbortSignal): Promise<ClusterSnapshot> {
  const data = await getStatus(signal)
  const observedAt = Date.parse(data.observed_at)
  if (!Number.isFinite(observedAt) || Date.now() - observedAt > 15_000 || observedAt > Date.now() + 1000) throw new Error('Backend snapshot is stale or has no observation time.')
  if (!data.coordinator?.id || !Array.isArray(data.nodes) || !Array.isArray(data.shards) || !data.metrics) throw new Error('Incomplete cluster snapshot.')
  return { cluster: clusterFromStatus(data), metrics: metricsFromStatus(data), observedAt }
}

export async function getCluster(): Promise<ClusterState> { return (await getSnapshot()).cluster }
export async function getMetrics(): Promise<Metrics> { return (await getSnapshot()).metrics }

export interface ExecuteQueryResponse {
  rows: Record<string, string>[]
  trace_id: string
  duration_ms: number
  query_type: string
  coordinator_id?: string
  events?: WsEvent[]
  events_truncated?: boolean
  error?: string
}

export async function executeQuery(sql: string, traceId: string): Promise<ExecuteQueryResponse> {
  return apiFetch<ExecuteQueryResponse>('/query', {
    method: 'POST',
    body: JSON.stringify({ query: sql, trace_id: traceId }),
  })
}

export async function stopNode(nodeId: string): Promise<{ status: string; node_id: string }> {
  return apiFetch<{ status: string; node_id: string }>(`/api/node/${encodeURIComponent(nodeId)}/stop`, { method: 'POST' })
}

export async function getRecoverySnapshot(signal?: AbortSignal): Promise<RecoverySnapshot> {
  return validateRecovery(await apiFetch<RecoverySnapshot>('/api/recovery/status', { signal }))
}
export async function setRecoveryMode(nodeId: string, mode: 'hold' | 'automatic', token: string): Promise<void> {
  const response = await apiFetch<{ node_id: string; mode: string }>('/api/recovery/mode', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ node_id: nodeId, mode }),
  })
  if (response.node_id !== nodeId || response.mode !== mode) throw new Error('Recovery response did not confirm the requested member and mode.')
}

export async function setNodePower(nodeId: string, action: 'start' | 'stop', token: string): Promise<void> {
 const response = await apiFetch<{node_id: string; action: string}>('/api/nodes/power', {
  method: 'POST', headers: {Authorization: `Bearer ${token}`}, body: JSON.stringify({node_id: nodeId, action}),
 })
 if (response.node_id !== nodeId || response.action !== action) throw new Error('Power action was not confirmed. Refresh status before trying again.')
}
