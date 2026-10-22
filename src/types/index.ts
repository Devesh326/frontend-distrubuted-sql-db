export type NodeRole = 'leader' | 'follower'

export type NodeHealth = 'healthy' | 'dead'

export interface StorageNode {
  id: string
  name: string
  address: string
  port: number
  alive: boolean
  isLeader: boolean
  shardCount: number
  shardRoles: { shardId: number; role: NodeRole }[]
}

export interface Coordinator {
  id: string
  name: string
  address: string
  port: number
  healthy: boolean
}

export interface MetadataNodeInfo {
  id: string
  address: string
  isLeader: boolean
  healthy: boolean
}

export interface MetadataClusterInfo {
  nodes: MetadataNodeInfo[]
  leaderId: string
  currentTerm: number
}

export interface ShardReplicaStatus {
  nodeId: string
  isLeader: boolean
  commitIndex: number
  appliedIndex: number
  term: number
}

export interface ShardRaftStatus {
  shardId: number
  term: number
  replicas: ShardReplicaStatus[]
}

export interface ClusterState {
  coordinator: Coordinator
  coordinators: Coordinator[]
  nodes: StorageNode[]
  shards: ShardInfo[]
  shardRaftDetail: ShardRaftStatus[]
  metadataCluster: MetadataClusterInfo | null
  buckets: number
}

export interface ShardInfo {
  id: number
  leader: string
  routingLeader?: string
  replicas: string[]
}

export interface Metrics {
  queryCount: number | null
  averageLatency: number | null
  clusterHealth: number | null
  nodesAlive: number
  nodesTotal: number
  shardCount: number
  coordinatorId: string
}

export type ConnectionStatus = 'loading' | 'connected' | 'stale' | 'unavailable'
export interface MetricSample extends Metrics { timestamp: number }
export interface ClusterSnapshot { cluster: ClusterState; metrics: Metrics; observedAt: number }

export interface RecoveryTarget {
  id: string
  role: 'metadata' | 'coordinator'
  mode: 'automatic' | 'hold'
  phase: string
  live: boolean
  ready: boolean
  attempts: number
  reason?: string
  observed_at: string
  next_attempt?: string
}
export interface PowerTarget extends Omit<RecoveryTarget, 'role'> {
 role: 'metadata' | 'coordinator' | 'storage'
 power: 'running' | 'stopped' | 'paused' | 'restarting' | 'unknown'
}
export interface RecoverySnapshot {
 project?: string
 power_nodes?: PowerTarget[]
 experiments_enabled?: boolean
  targets: RecoveryTarget[]
  metadata_quorum: 'confirmed' | 'unavailable'
  desired_coordinators: number
  desired_metadata: number
  error?: string
  observed_at: string
}

export type SidebarView = 'cluster' | 'playground' | 'metrics' | 'logs' | 'settings'

export interface LogEntry {
  id: string
  timestamp: string
  message: string
  level: 'info' | 'warn' | 'error' | 'debug'
}

export interface SettingsState {
  animationSpeed: number
  packetAnimation: boolean
  gridVisibility: boolean
  leaderHighlight: boolean
  autoLayout: boolean
}

export interface MetricDetail {
  key: string
  label: string
  value: number
  unit: string
  color: string
  icon: string
  history: { time: string; value: number }[]
  p95?: number
  p99?: number
  description: string
}

export interface NodeDetail {
  host: string
  address: string
  alive: boolean
  isLeader: boolean
  shardCount: number
  shards: { id: string; range: string; size: string; leader: boolean }[]
  recentEvents: { time: string; event: string; type: 'info' | 'warn' | 'error' }[]
}

export interface CoordinatorDetail {
  connectedNodes: string[]
  incomingRequests: number
  routingTable: { shard: string; node: string }[]
  averageLatency: number
  activeQueries: number
  requestHistory: { time: string; count: number }[]
}

export type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'COUNT' | 'JOIN'

export type PacketTarget = string | null

export interface ExecutionStep {
  id: string
  label: string
  duration: number
  highlightNode: string | null
  packetTarget: string | null
  packetLabel: string
  timestamp?: string
  error?: boolean
}

export interface HistoryEntry {
  id: string
  query: string
  type: QueryType
  timestamp: number
  duration: number
  steps: ExecutionStep[]
  coordinatorId?: string
}

export interface QueuedQuery {
  id: string
  query: string
  type: QueryType
}

export interface QueryResultRow {
  fields: Record<string, string>
}

export interface WsEvent {
  type: string
  trace_id?: string
  node_id?: string
  shard_id?: number
  sql?: string
  timestamp: string
  metadata?: Record<string, unknown>
}
