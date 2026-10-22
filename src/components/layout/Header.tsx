import { motion } from 'framer-motion'
import { useClusterStore } from '@/store/clusterStore'
import { Database, Server, ShieldCheck, Network, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Header() {
  const cluster = useClusterStore((s) => s.cluster)
  const status = useClusterStore((s) => s.connectionStatus)
  const error = useClusterStore((s) => s.connectionError)
  const hasData = useClusterStore(s => s.lastPollTimestamp > 0)

  const aliveCount = cluster.nodes.filter((n) => n.alive).length
  const aliveCoords = cluster.coordinators.filter((c) => c.healthy).length
  const totalCoords = cluster.coordinators.length
  const leaderCount = cluster.shards.filter(shard => !!shard.leader).length

  const stats = [
    {
      label: 'Cluster',
      value: 'Distributed SQL Playground',
      icon: <Database size={14} />,
    },
    {
      label: 'Coordinators',
      value: `${aliveCoords}/${totalCoords} Online`,
      icon: <Server size={14} />,
    },
    {
      label: 'Shard Leaders',
      value: cluster.shardRaftDetail.length ? `${leaderCount}/${cluster.shards.length} groups` : 'Not reported',
      icon: <GitBranch size={14} />,
    },
    {
      label: 'Replication',
      value: `Factor ${cluster.shards.length > 0 ? cluster.shards[0].replicas.length : 0}`,
      icon: <ShieldCheck size={14} />,
    },
    {
      label: 'Storage',
      value: `${aliveCount} / ${cluster.nodes.length} Online`,
      icon: <Network size={14} />,
    },
  ]
  const allReportedOnline = cluster.nodes.length > 0 && aliveCount === cluster.nodes.length && totalCoords > 0 && aliveCoords === totalCoords && !!cluster.metadataCluster?.nodes.length && cluster.metadataCluster.nodes.every(node => node.healthy)
  const label = status === 'loading' ? 'Connecting' : status === 'unavailable' ? 'Backend unavailable' : status === 'stale' ? 'Last known data' : allReportedOnline ? 'Reported nodes online' : 'Degraded / incomplete'

  return (
    <header className="h-12 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between gap-4 px-3 shrink-0 overflow-x-auto">
      <div className="flex items-center gap-4 shrink-0">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className={`items-center gap-2 text-xs whitespace-nowrap shrink-0 ${stat.label === 'Cluster' ? 'hidden xl:flex' : 'flex'}`}
          >
            <span className="text-muted-foreground">{stat.icon}</span>
            <span className="text-muted-foreground hidden lg:inline">{stat.label}:</span>
            <span className="text-foreground font-medium">{hasData || stat.label === 'Cluster' ? stat.value : '—'}</span>
          </motion.div>
        ))}
      </div>

      <div role="status" title={error || 'Node availability does not prove Raft quorum or SQL readiness.'} className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap shrink-0">
        <div className={cn('w-1.5 h-1.5 rounded-full', status === 'connected' && allReportedOnline ? 'bg-green-500' : 'bg-amber-500')} />
        {label}
      </div>
    </header>
  )
}
