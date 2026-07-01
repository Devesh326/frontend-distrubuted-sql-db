import { motion } from 'framer-motion'
import { useClusterStore } from '@/store/clusterStore'
import { Database, Server, ShieldCheck, Network } from 'lucide-react'

export function Header() {
  const cluster = useClusterStore((s) => s.cluster)

  const stats = [
    {
      label: 'Cluster',
      value: 'Distributed SQL Playground',
      icon: <Database size={14} />,
    },
    {
      label: 'Leader',
      value: cluster.activeLeader
        ? cluster.nodes.find((n) => n.id === cluster.activeLeader)?.name ?? 'N/A'
        : 'N/A',
      icon: <Server size={14} />,
    },
    {
      label: 'Replication',
      value: `Factor ${cluster.replicationFactor}`,
      icon: <ShieldCheck size={14} />,
    },
    {
      label: 'Nodes',
      value: `${cluster.totalNodes} Online`,
      icon: <Network size={14} />,
    },
  ]

  return (
    <header className="h-12 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="flex items-center gap-2 text-xs"
          >
            <span className="text-muted-foreground">{stat.icon}</span>
            <span className="text-muted-foreground">{stat.label}:</span>
            <span className="text-foreground font-medium">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-soft" />
        All Systems Operational
      </div>
    </header>
  )
}
