import { motion, AnimatePresence } from 'framer-motion'
import { X, Share2, Wifi, Route, Gauge, Activity, Clock, BarChart3 } from 'lucide-react'
import { useClusterStore } from '@/store/clusterStore'
import { cn } from '@/lib/utils'

const coordinatorDetail = {
  connectedNodes: ['Neon-1 (leader)', 'Neon-2 (replica)', 'Neon-3 (replica)'],
  incomingRequests: 14283,
  routingTable: [
    { shard: 'shard-001 -> shard-004', node: 'Neon-1' },
    { shard: 'shard-005 -> shard-006', node: 'Neon-2' },
    { shard: 'shard-007 -> shard-008', node: 'Neon-3' },
  ],
  averageLatency: 2.4,
  activeQueries: 3,
  requestHistory: Array.from({ length: 12 }, (_, i) => ({
    time: `T${i * 5}`,
    count: Math.floor(200 + Math.sin(i * 0.8) * 80 + Math.random() * 60),
  })),
}

export function CoordinatorDrawer() {
  const drawerOpen = useClusterStore((s) => s.drawerOpen)
  const drawerType = useClusterStore((s) => s.drawerType)
  const setDrawerOpen = useClusterStore((s) => s.setDrawerOpen)
  const setDrawerType = useClusterStore((s) => s.setDrawerType)
  const setSelectedNodeId = useClusterStore((s) => s.setSelectedNodeId)
  const coordinator = useClusterStore((s) => s.cluster.coordinator)
  const cluster = useClusterStore((s) => s.cluster)

  const handleClose = () => {
    setDrawerOpen(false)
    setDrawerType(null)
    setSelectedNodeId(null)
  }

  const isOpen = drawerOpen && drawerType === 'coordinator'

  return (
    <AnimatePresence>
      {isOpen && (
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
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Share2 size={16} className="text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{coordinator.name}</span>
                    <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">COORDINATOR</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">:{coordinator.port}</span>
                </div>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <Section icon={<Wifi size={14} />} title="Connected Nodes">
                <div className="space-y-1">
                  {coordinatorDetail.connectedNodes.map((n, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20">
                      <div className={cn('w-1.5 h-1.5 rounded-full', i === 0 ? 'bg-green-500' : 'bg-blue-500')} />
                      <span className="text-[11px] text-foreground">{n}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section icon={<Gauge size={14} />} title="Current Load">
                <div className="grid grid-cols-2 gap-3">
                  <MetricItem icon={<Activity size={12} />} label="Active Queries" value={coordinatorDetail.activeQueries.toString()} />
                  <MetricItem icon={<BarChart3 size={12} />} label="Total Requests" value={coordinatorDetail.incomingRequests.toLocaleString()} />
                  <MetricItem icon={<Clock size={12} />} label="Avg Latency" value={`${coordinatorDetail.averageLatency}ms`} color="text-yellow-400" />
                  <MetricItem icon={<Wifi size={12} />} label="Nodes" value={`${cluster.nodes.length} connected`} />
                </div>
              </Section>

              <Section icon={<Route size={14} />} title="Routing Table">
                <div className="space-y-1">
                  {coordinatorDetail.routingTable.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/20">
                      <span className="text-[10px] font-mono text-muted-foreground">{entry.shard}</span>
                      <span className="text-[10px] font-medium text-primary">→ {entry.node}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section icon={<Activity size={14} />} title="Request History">
                <div className="h-32">
                  <div className="flex items-end gap-[2px] h-full">
                    {coordinatorDetail.requestHistory.map((point, i) => {
                      const maxCount = Math.max(...coordinatorDetail.requestHistory.map((p) => p.count))
                      const height = (point.count / maxCount) * 100
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-purple-500/30 hover:bg-purple-500/50 transition-colors relative group"
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[9px] text-muted-foreground whitespace-nowrap transition-opacity">
                            {point.count}
                          </div>
                        </div>
                      )
                    })}
                  </div>
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
