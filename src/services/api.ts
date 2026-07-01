import type { ClusterState, Metrics } from '@/types'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const mockCluster: ClusterState = {
  coordinator: {
    id: 'coord-1',
    name: 'Coordinator',
    port: 26257,
    health: 'healthy',
  },
  nodes: [
    {
      id: 'node-1',
      name: 'Neon-1',
      role: 'leader',
      port: 26258,
      cpu: 42,
      memory: 68,
      storage: 55,
      shardCount: 24,
      health: 'healthy',
      isLeader: true,
    },
    {
      id: 'node-2',
      name: 'Neon-2',
      role: 'replica',
      port: 26259,
      cpu: 38,
      memory: 45,
      storage: 52,
      shardCount: 18,
      health: 'healthy',
      isLeader: false,
    },
    {
      id: 'node-3',
      name: 'Neon-3',
      role: 'replica',
      port: 26260,
      cpu: 55,
      memory: 72,
      storage: 48,
      shardCount: 20,
      health: 'healthy',
      isLeader: false,
    },
  ],
  activeLeader: 'node-1',
  replicationFactor: 3,
  totalNodes: 3,
}

const mockMetrics: Metrics = {
  queryCount: 14283,
  averageLatency: 2.4,
  clusterHealth: 99.7,
  replicationEvents: 156,
  activeConnections: 8,
  errorCount: 3,
}

export async function getCluster(): Promise<ClusterState> {
  await delay(200)
  return { ...mockCluster, nodes: [...mockCluster.nodes] }
}

export async function getMetrics(): Promise<Metrics> {
  await delay(100)
  return { ...mockMetrics }
}

export async function getHealth(): Promise<{ status: string; message: string }> {
  await delay(50)
  return { status: 'healthy', message: 'All nodes operational' }
}
