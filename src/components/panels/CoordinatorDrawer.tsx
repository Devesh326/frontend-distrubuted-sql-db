import { motion, AnimatePresence } from 'framer-motion'
import { X, Share2, Wifi, Route, Gauge, Activity, Clock, BarChart3 } from 'lucide-react'
import { useClusterStore } from '@/store/clusterStore'
import { cn } from '@/lib/utils'
import { RecoveryPanel } from './RecoveryPanel'

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

export function CoordinatorDrawer() {
  const drawerOpen = useClusterStore((s) => s.drawerOpen)
  const drawerSession = useClusterStore(s => s.drawerSession)
  const drawerType = useClusterStore((s) => s.drawerType)
  const setDrawerOpen = useClusterStore((s) => s.setDrawerOpen)
  const setDrawerType = useClusterStore((s) => s.setDrawerType)
  const setSelectedNodeId = useClusterStore((s) => s.setSelectedNodeId)
  const cluster = useClusterStore((s) => s.cluster)
  const selectedId = useClusterStore(s => s.selectedNodeId)
  const recovery = useClusterStore(s => s.recovery)
  const managed = recovery?.targets.find(target => target.id === selectedId && target.role === 'coordinator')
  const coordinator = cluster.coordinators.find(node => node.id === selectedId) || (cluster.coordinator.id === selectedId ? cluster.coordinator : null) || (managed ? { id: managed.id, name: `Coordinator ${managed.id}`, port: 0 } : null)
  const status = useClusterStore(s => s.connectionStatus)
  const phase = useClusterStore(s => s.executionPhase)
  const lastQueryDurationMs = useClusterStore((s) => s.lastQueryDurationMs)

  const handleClose = () => {
    setDrawerOpen(false)
    setDrawerType(null)
    setSelectedNodeId(null)
  }

  const isOpen = drawerOpen && drawerType === 'coordinator'
  if (!coordinator) return null

  const aliveNodes = cluster.nodes.filter((n) => n.alive)
  const deadNodes = cluster.nodes.filter((n) => !n.alive)

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
            className="fixed right-0 top-0 h-full w-[400px] max-w-full bg-card border-l border-border z-50 overflow-y-auto"
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
                  <span className="text-[10px] text-muted-foreground font-mono">{coordinator.port ? `:${coordinator.port}` : 'Port not reported'}</span>
                </div>
              </div>
              <button aria-label="Close coordinator details" onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <RecoveryPanel key={`${coordinator.id}-${drawerSession}`} nodeId={coordinator.id}/>
              <p className="text-[10px] text-muted-foreground">Snapshot from {cluster.coordinator.id}. {status !== 'connected' && 'Last known data; current health unknown.'}</p>
              <Section icon={<Wifi size={14} />} title="Reported Storage Nodes">
                <div className="space-y-1">
                  {aliveNodes.map((n) => (
                    <div key={n.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[11px] text-foreground">{n.name}</span>
                      {n.shardRoles.filter((r) => r.role === 'leader').length > 0 && (
                        <span className="text-[9px] text-primary bg-primary/10 px-1 py-0.5 rounded ml-auto">LEADER</span>
                      )}
                    </div>
                  ))}
                  {deadNodes.map((n) => (
                    <div key={n.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[11px] text-muted-foreground">{n.name}</span>
                      <span className="text-[9px] text-red-400 bg-red-500/10 px-1 py-0.5 rounded ml-auto">DOWN</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section icon={<Route size={14} />} title="Routing Table">
                <div className="space-y-1">
                  {cluster.shards.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">No shards configured</p>
                  )}
                  {cluster.shards.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/20">
                      <span className="text-[10px] font-mono text-muted-foreground">Shard {s.id}</span>
                      <span className="text-[10px] font-medium text-primary">→ {s.routingLeader ?? s.leader ?? 'pending'}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section icon={<Gauge size={14} />} title="Browser Activity">
                <div className="grid grid-cols-2 gap-3">
                  <MetricItem icon={<Activity size={12} />} label="Browser Request" value={phase === 'waiting' ? 'waiting' : 'idle'} />
                  <MetricItem icon={<BarChart3 size={12} />} label="Storage Nodes" value={String(cluster.nodes.length)} />
                  <MetricItem icon={<Clock size={12} />} label="Last Query" value={lastQueryDurationMs > 0 ? `${lastQueryDurationMs}ms` : '—'} color={lastQueryDurationMs > 0 ? 'text-yellow-400' : ''} />
                  <MetricItem icon={<Wifi size={12} />} label="Alive" value={`${aliveNodes.length}/${cluster.nodes.length}`} />
                </div>
              </Section>

              <Section icon={<Share2 size={14} />} title="Coordinators">
                <div className="space-y-1">
                  {cluster.coordinators.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20">
                      <div className={cn('w-1.5 h-1.5 rounded-full', c.healthy ? 'bg-green-500' : 'bg-red-500')} />
                      <span className="text-[11px] text-foreground">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">:{c.port}</span>
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
