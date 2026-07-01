import { motion, AnimatePresence } from 'framer-motion'
import { X, Server, Cpu, HardDrive, Activity, Wifi, Database, Clock, GitBranch, Heart } from 'lucide-react'
import { useClusterStore } from '@/store/clusterStore'
import type { NodeDetail } from '@/types'
import { cn } from '@/lib/utils'

const mockNodeDetails: Record<string, NodeDetail> = {
  'node-1': {
    host: '10.0.1.10',
    replicaLag: 0,
    recentQueries: [
      'SELECT * FROM users WHERE id = 42',
      'INSERT INTO orders (user_id, total) VALUES (12, 99.50)',
      'UPDATE inventory SET stock = stock - 1 WHERE sku = "ABC-123"',
      'SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id',
    ],
    connectedNodes: ['coord-1', 'node-2', 'node-3'],
    shards: [
      { id: 'shard-001', range: '[0, 1000)', size: '256MB', leader: true },
      { id: 'shard-002', range: '[1000, 2000)', size: '192MB', leader: true },
      { id: 'shard-003', range: '[2000, 3000)', size: '320MB', leader: true },
      { id: 'shard-004', range: '[3000, 4000)', size: '128MB', leader: true },
    ],
    heartbeat: '2ms',
    recentEvents: [
      { time: '10:00:03', event: 'WAL flush completed', type: 'info' },
      { time: '10:00:02', event: 'Heartbeat received from coordinator', type: 'info' },
      { time: '09:59:58', event: 'Replication stream from leader', type: 'info' },
      { time: '09:59:55', event: 'Query routed to this node', type: 'info' },
    ],
  },
  'node-2': {
    host: '10.0.1.11',
    replicaLag: 12,
    recentQueries: [
      'SELECT * FROM users WHERE id = 42',
      'SELECT COUNT(*) FROM orders',
    ],
    connectedNodes: ['coord-1', 'node-1', 'node-3'],
    shards: [
      { id: 'shard-005', range: '[0, 1000)', size: '256MB', leader: false },
      { id: 'shard-006', range: '[1000, 2000)', size: '192MB', leader: false },
    ],
    heartbeat: '4ms',
    recentEvents: [
      { time: '10:00:03', event: 'Replica synchronized with leader', type: 'info' },
      { time: '10:00:01', event: 'Replication lag: 12ms', type: 'warn' },
      { time: '09:59:58', event: 'Heartbeat received from coordinator', type: 'info' },
    ],
  },
  'node-3': {
    host: '10.0.1.12',
    replicaLag: 8,
    recentQueries: [
      'SELECT * FROM users WHERE id = 42',
      'ANALYZE TABLE orders',
    ],
    connectedNodes: ['coord-1', 'node-1', 'node-2'],
    shards: [
      { id: 'shard-007', range: '[2000, 3000)', size: '320MB', leader: false },
      { id: 'shard-008', range: '[3000, 4000)', size: '128MB', leader: false },
    ],
    heartbeat: '3ms',
    recentEvents: [
      { time: '10:00:02', event: 'Replica synchronized with leader', type: 'info' },
      { time: '10:00:00', event: 'Health check passed', type: 'info' },
      { time: '09:59:55', event: 'Heartbeat received from coordinator', type: 'info' },
    ],
  },
}

export function NodeDrawer() {
  const selectedNodeId = useClusterStore((s) => s.selectedNodeId)
  const setSelectedNodeId = useClusterStore((s) => s.setSelectedNodeId)
  const drawerOpen = useClusterStore((s) => s.drawerOpen)
  const setDrawerOpen = useClusterStore((s) => s.setDrawerOpen)
  const setDrawerType = useClusterStore((s) => s.setDrawerType)
  const cluster = useClusterStore((s) => s.cluster)
  const node = cluster.nodes.find((n) => n.id === selectedNodeId)

  const detail = selectedNodeId ? mockNodeDetails[selectedNodeId] : null

  const handleClose = () => {
    setDrawerOpen(false)
    setDrawerType(null)
    setSelectedNodeId(null)
  }

  if (!node || !detail) return null

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[400px] bg-card border-l border-border z-50 overflow-y-auto"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', node.isLeader ? 'bg-primary/20' : 'bg-secondary')}>
                  <Server size={16} className={node.isLeader ? 'text-primary' : 'text-muted-foreground'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{node.name}</span>
                    {node.isLeader ? (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">LEADER</span>
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">REPLICA</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{detail.host}:{node.port}</span>
                </div>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <Section icon={<Activity size={14} />} title="Resources">
                <div className="grid grid-cols-2 gap-3">
                  <MetricItem icon={<Cpu size={12} />} label="CPU" value={`${node.cpu}%`} />
                  <MetricItem icon={<HardDrive size={12} />} label="Memory" value={`${node.memory}%`} />
                  <MetricItem icon={<Database size={12} />} label="Storage" value={`${node.storage}%`} />
                  <MetricItem icon={<Wifi size={12} />} label="Health" value={node.health} color={node.health === 'healthy' ? 'text-green-400' : 'text-red-400'} />
                </div>
              </Section>

              <Section icon={<GitBranch size={14} />} title="Shards">
                <div className="space-y-1.5">
                  {detail.shards.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/20">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-foreground">{s.id}</span>
                        <span className="text-[10px] text-muted-foreground">{s.range}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{s.size}</span>
                        {s.leader && <span className="text-[9px] text-primary bg-primary/10 px-1 rounded">L</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section icon={<Clock size={14} />} title="Recent Queries">
                <div className="space-y-1">
                  {detail.recentQueries.map((q, i) => (
                    <div key={i} className="px-2 py-1.5 rounded bg-muted/20 text-[11px] font-mono text-foreground/80 truncate">
                      {q}
                    </div>
                  ))}
                </div>
              </Section>

              <Section icon={<GitBranch size={14} />} title="Replication">
                <div className="grid grid-cols-2 gap-3">
                  <MetricItem icon={<Clock size={12} />} label="Lag" value={`${detail.replicaLag}ms`} color={detail.replicaLag > 10 ? 'text-yellow-400' : 'text-green-400'} />
                  <MetricItem icon={<Heart size={12} />} label="Heartbeat" value={detail.heartbeat} />
                  <MetricItem icon={<Wifi size={12} />} label="Connected" value={`${detail.connectedNodes.length} nodes`} />
                </div>
              </Section>

              <Section icon={<Activity size={14} />} title="Recent Events">
                <div className="space-y-1">
                  {detail.recentEvents.map((evt, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20">
                      <span className="text-[10px] text-muted-foreground shrink-0">{evt.time}</span>
                      <span className={cn('text-[10px] font-medium', evt.type === 'error' ? 'text-red-400' : evt.type === 'warn' ? 'text-yellow-400' : 'text-green-400')}>
                        [{evt.type.toUpperCase()}]
                      </span>
                      <span className="text-[11px] text-foreground/80 truncate">{evt.event}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-medium text-foreground">{title}</span>
      </div>
      {children}
    </div>
  )
}

function MetricItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-[11px] font-mono ml-auto ${color || 'text-foreground'}`}>{value}</span>
    </div>
  )
}
