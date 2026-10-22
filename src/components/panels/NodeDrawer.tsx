import { RecoveryPanel } from './RecoveryPanel'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Server, Database, Wifi, Clock, GitBranch, Heart, Activity, Shield } from 'lucide-react'
import { useClusterStore } from '@/store/clusterStore'
import { cn } from '@/lib/utils'

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

export function NodeDrawer() {
  const selectedNodeId = useClusterStore((s) => s.selectedNodeId)
  const setSelectedNodeId = useClusterStore((s) => s.setSelectedNodeId)
  const drawerOpen = useClusterStore((s) => s.drawerOpen)
  const setDrawerOpen = useClusterStore((s) => s.setDrawerOpen)
  const setDrawerType = useClusterStore((s) => s.setDrawerType)
  const cluster = useClusterStore((s) => s.cluster)
  const drawerSession = useClusterStore(s => s.drawerSession)
  const drawerType = useClusterStore(s => s.drawerType)
  const status = useClusterStore(s => s.connectionStatus)
  const nodeEventLog = useClusterStore((s) => s.nodeEventLog)

  const managed = useClusterStore(s => s.recovery?.power_nodes?.find(member => member.id === selectedNodeId && member.role === 'storage'))
  const node = cluster.nodes.find((n) => n.id === selectedNodeId) || (managed ? {id: managed.id, name: managed.id, address: '', port: 0, alive: false, isLeader: false, shardCount: 0, shardRoles: []} : null)

  const handleClose = () => {
    setDrawerOpen(false)
    setDrawerType(null)
    setSelectedNodeId(null)
  }

  if (!node) return null

  const events = (nodeEventLog[node.id] || []).slice(-15)
  const nodeShards = cluster.shards.filter((s) => s.replicas.includes(node.id))
  const leaderCount = node.shardRoles.filter((r) => r.role === 'leader').length
  const followerCount = node.shardRoles.filter((r) => r.role === 'follower').length

  // Per-shard Raft detail from shardRaftDetail
  const raftDetails = cluster.shardRaftDetail.filter((sr) =>
    sr.replicas.some((r) => r.nodeId === node.id)
  )

  return (
    <AnimatePresence>
      {drawerOpen && drawerType === 'node' && (
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
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', leaderCount > 0 ? 'bg-primary/20' : 'bg-secondary')}>
                  <Server size={16} className={leaderCount > 0 ? 'text-primary' : 'text-muted-foreground'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{node.name}</span>
                    {status !== 'connected' ? <span className="text-[10px] text-muted-foreground">UNKNOWN</span> : leaderCount > 0 ? (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">LEADER</span>
                    ) : node.alive ? (
                      <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">FOLLOWER</span>
                    ) : (
                      <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">DOWN</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{node.address}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button aria-label="Close storage details" onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {status !== 'connected' && <p className="text-xs text-amber-400">Last known data; current health is unknown.</p>}
<RecoveryPanel key={`${node.id}-${drawerSession}`} nodeId={node.id}/>
              <Section icon={<Activity size={14} />} title="Status">
                <div className="grid grid-cols-2 gap-3">
                  <MetricItem icon={<Wifi size={12} />} label="Health" value={status !== 'connected' ? 'unknown' : node.alive ? 'reported online' : 'reported down'} color={status !== 'connected' ? '' : node.alive ? 'text-green-400' : 'text-red-400'} />
                  <MetricItem icon={<Database size={12} />} label="Total Shards" value={String(node.shardCount)} />
                  <MetricItem icon={<GitBranch size={12} />} label="Leads" value={String(leaderCount)} color="text-primary" />
                  <MetricItem icon={<GitBranch size={12} />} label="Follows" value={String(followerCount)} />
                </div>
              </Section>

              <Section icon={<GitBranch size={14} />} title="Shard Roles">
                <div className="space-y-1.5">
                  {nodeShards.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">No shards assigned</p>
                  )}
                  {nodeShards.map((s) => {
                    const role = node.shardRoles.find((r) => r.shardId === s.id)
                    const raft = raftDetails.find((r) => r.shardId === s.id)
                    const rep = raft?.replicas.find((r) => r.nodeId === node.id)
                    return (
                      <div key={s.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/20">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-foreground">Shard {s.id}</span>
                          {role?.role === 'leader' && (
                            <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">L</span>
                          )}
                          {role?.role === 'follower' && (
                            <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">F</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                          {rep && (
                            <>
                              <span>term {rep.term}</span>
                              <span>commit {rep.commitIndex}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>

              <Section icon={<Shield size={14} />} title="Raft Detail">
                <div className="space-y-1.5">
                  {raftDetails.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">No Raft data available</p>
                  )}
                  {raftDetails.map((sr) => {
                    const rep = sr.replicas.find((r) => r.nodeId === node.id)
                    if (!rep) return null
                    return (
                      <div key={sr.shardId} className="px-2 py-1.5 rounded bg-muted/20 space-y-1">
                        <div className="text-[11px] font-mono text-foreground">Shard {sr.shardId}</div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                          <span className="text-muted-foreground">Term</span>
                          <span className="text-foreground font-mono text-right">{rep.term}</span>
                          <span className="text-muted-foreground">Commit Index</span>
                          <span className="text-foreground font-mono text-right">{rep.commitIndex}</span>
                          <span className="text-muted-foreground">Applied Index</span>
                          <span className="text-foreground font-mono text-right">{rep.appliedIndex}</span>
                          <span className="text-muted-foreground">Reported local role</span>
                          <span className={cn('font-mono text-right', rep.isLeader ? 'text-primary' : '')}>
                            {rep.isLeader ? 'Leader' : 'Follower'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>

              <Section icon={<Heart size={14} />} title="Replication">
                <div className="grid grid-cols-2 gap-3">
                  <MetricItem icon={<Wifi size={12} />} label="Replicas per shard" value={`${nodeShards.length > 0 ? nodeShards[0].replicas.length : 0} nodes`} />
                </div>
              </Section>

              <Section icon={<Clock size={14} />} title="Recent Node Events">
                <div className="space-y-1">
                  {events.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">No events yet</p>
                  )}
                  {events.map((evt, i) => (
                    <div key={evt.id || i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20">
                      <span className="text-[10px] text-muted-foreground shrink-0">{evt.timestamp.slice(11, 23)}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">{evt.type}</span>
                      <span className="text-[11px] text-foreground/80 truncate">{evt.message}</span>
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
