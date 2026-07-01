export type NodeRole = 'leader' | 'replica'

export type NodeHealth = 'healthy' | 'degraded' | 'down'

export interface StorageNode {
  id: string
  name: string
  role: NodeRole
  port: number
  cpu: number
  memory: number
  storage: number
  shardCount: number
  health: NodeHealth
  isLeader: boolean
}

export interface Coordinator {
  id: string
  name: string
  port: number
  health: NodeHealth
}

export interface ClusterState {
  coordinator: Coordinator
  nodes: StorageNode[]
  activeLeader: string
  replicationFactor: number
  totalNodes: number
}

export interface Metrics {
  queryCount: number
  averageLatency: number
  clusterHealth: number
  replicationEvents: number
  activeConnections: number
  errorCount: number
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
  replicaLag: number
  recentQueries: string[]
  connectedNodes: string[]
  shards: { id: string; range: string; size: string; leader: boolean }[]
  heartbeat: string
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

export type PacketTarget = 'client' | 'coordinator' | 'leader' | 'replica1' | 'replica2' | null

export interface ExecutionStep {
  id: string
  label: string
  duration: number
  highlightNode: PacketTarget
  packetTarget: PacketTarget
  packetLabel: string
}

export interface HistoryEntry {
  id: string
  query: string
  type: QueryType
  timestamp: number
  duration: number
  steps: ExecutionStep[]
}

export interface QueuedQuery {
  id: string
  query: string
  type: QueryType
}
