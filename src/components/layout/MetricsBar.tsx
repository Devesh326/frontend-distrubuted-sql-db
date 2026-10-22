import { motion } from 'framer-motion'
import { useClusterStore } from '@/store/clusterStore'
import {
  Activity,
  Gauge,
  HeartPulse,
  Server,
  Wifi,
} from 'lucide-react'

const metricConfig = [
  {
    key: 'queryCount',
    label: 'Query Count',
    icon: <Activity size={13} />,
    format: (v: number) => v.toLocaleString(),
    color: 'text-blue-400',
  },
  {
    key: 'averageLatency',
    label: 'Avg Latency',
    icon: <Gauge size={13} />,
    format: (v: number) => `${v.toFixed(1)}ms`,
    color: 'text-yellow-400',
  },
  {
    key: 'clusterHealth',
    label: 'Storage Online',
    icon: <HeartPulse size={13} />,
    format: (v: number) => `${v.toFixed(1)}%`,
    color: 'text-green-400',
  },
  {
    key: 'nodesAlive',
    label: 'Nodes Alive',
    icon: <Server size={13} />,
    format: (v: number) => `${v}/${useClusterStore.getState().metrics.nodesTotal}`,
    color: 'text-cyan-400',
  },
  {
    key: 'shardCount',
    label: 'Shards',
    icon: <Wifi size={13} />,
    format: (v: number) => v.toString(),
    color: 'text-purple-400',
  },
]

export function MetricsBar() {
  const metrics = useClusterStore((s) => s.metrics)
  const isExecuting = useClusterStore((s) => s.isExecuting)
  const status = useClusterStore((s) => s.connectionStatus)
  const setMetricModalKey = useClusterStore((s) => s.setMetricModalKey)

  return (
    <div className="h-14 border-t border-border bg-sidebar flex items-center shrink-0 overflow-x-auto">
      <div className="flex items-center gap-0 w-full">
        {metricConfig.map((metric, i) => {
          const value = metrics[metric.key as keyof typeof metrics]
          return (
            <motion.div
              key={metric.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              onClick={() => setMetricModalKey(metric.key)}
              title={metric.key === 'queryCount' || metric.key === 'averageLatency' ? `Measured on ${metrics.coordinatorId || 'unavailable coordinator'}; not cluster-wide` : 'Reported storage topology; not a quorum or query-readiness check'}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 border-r border-border last:border-r-0 min-w-fit cursor-pointer hover:bg-muted/10 transition-colors relative"
            >
              {(isExecuting && (metric.key === 'queryCount')) && (
                <motion.span
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
              )}
              <span className="text-muted-foreground">{metric.icon}</span>
              <span className="text-xs text-muted-foreground">{metric.label}</span>
              <motion.span
                key={`${metric.key}-${value}`}
                initial={{ scale: 1.3, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-xs font-semibold tabular-nums ${metric.color}`}
              >
                {status === 'connected' && typeof value === 'number' ? metric.format(value) : '—'}
              </motion.span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
