import { motion, AnimatePresence } from 'framer-motion'
import { X, Activity, Gauge, HeartPulse, Repeat, Wifi, AlertTriangle } from 'lucide-react'
import { useClusterStore } from '@/store/clusterStore'
import type { MetricDetail } from '@/types'

const metricDetails: Record<string, MetricDetail> = {
  queryCount: {
    key: 'queryCount',
    label: 'Query Count',
    value: 14283,
    unit: 'queries',
    color: 'text-blue-400',
    icon: 'Activity',
    history: Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      value: Math.floor(500 + Math.sin(i * 0.5) * 200 + Math.random() * 150),
    })),
    description: 'Total number of SQL queries processed by the cluster since startup.',
  },
  averageLatency: {
    key: 'averageLatency',
    label: 'Average Latency',
    value: 2.4,
    unit: 'ms',
    color: 'text-yellow-400',
    icon: 'Gauge',
    history: Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      value: Math.max(0.5, 2 + Math.sin(i * 0.4 + 1) * 0.8 + Math.random() * 0.6),
    })),
    p95: 4.2,
    p99: 6.8,
    description: 'Average time taken for a query to complete across all nodes.',
  },
  clusterHealth: {
    key: 'clusterHealth',
    label: 'Cluster Health',
    value: 99.7,
    unit: '%',
    color: 'text-green-400',
    icon: 'HeartPulse',
    history: Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      value: 99.5 + Math.random() * 0.5,
    })),
    description: 'Overall cluster health score based on node availability and response times.',
  },
  replicationEvents: {
    key: 'replicationEvents',
    label: 'Replication Events',
    value: 156,
    unit: 'events',
    color: 'text-purple-400',
    icon: 'Repeat',
    history: Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      value: Math.floor(5 + Math.sin(i * 0.3 + 2) * 3 + Math.random() * 4),
    })),
    description: 'Number of replication events including WAL flushes, snapshot transfers, and sync operations.',
  },
  activeConnections: {
    key: 'activeConnections',
    label: 'Active Connections',
    value: 8,
    unit: 'connections',
    color: 'text-cyan-400',
    icon: 'Wifi',
    history: Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      value: Math.floor(6 + Math.sin(i * 0.6 + 3) * 2 + Math.random() * 3),
    })),
    description: 'Current number of active client connections to the cluster.',
  },
  errorCount: {
    key: 'errorCount',
    label: 'Error Count',
    value: 3,
    unit: 'errors',
    color: 'text-red-400',
    icon: 'AlertTriangle',
    history: Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      value: Math.floor(Math.random() * 2),
    })),
    description: 'Total number of errors encountered during query processing.',
  },
}

const icons: Record<string, React.ReactNode> = {
  Activity: <Activity size={14} />,
  Gauge: <Gauge size={14} />,
  HeartPulse: <HeartPulse size={14} />,
  Repeat: <Repeat size={14} />,
  Wifi: <Wifi size={14} />,
  AlertTriangle: <AlertTriangle size={14} />,
}

export function MetricDetailModal() {
  const metricModalKey = useClusterStore((s) => s.metricModalKey)
  const setMetricModalKey = useClusterStore((s) => s.setMetricModalKey)

  const detail = metricModalKey ? metricDetails[metricModalKey] : null

  if (!detail) return null

  const maxValue = Math.max(...detail.history.map((h) => h.value))

  return (
    <AnimatePresence>
      {metricModalKey && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50"
            onClick={() => setMetricModalKey(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-card border border-border rounded-xl z-50 shadow-2xl"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{icons[detail.icon]}</span>
                <span className="text-sm font-semibold text-foreground">{detail.label}</span>
                <span className={`text-lg font-bold font-mono ${detail.color}`}>{detail.value}{detail.unit === '%' ? '%' : ''}</span>
              </div>
              <button onClick={() => setMetricModalKey(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>

              <div className="h-40">
                <div className="flex items-end gap-[2px] h-full">
                  {detail.history.map((point, i) => {
                    const height = (point.value / maxValue) * 100
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-primary/20 hover:bg-primary/40 transition-colors relative group"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[9px] text-muted-foreground whitespace-nowrap transition-opacity">
                          {point.value.toFixed(1)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{detail.history[0].time}</span>
                <span>{detail.history[detail.history.length - 1].time}</span>
              </div>

              {detail.p95 !== undefined && detail.p99 !== undefined && (
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">Average</div>
                    <div className="text-sm font-mono text-foreground">{detail.value}{detail.unit === 'ms' ? 'ms' : ''}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">P95</div>
                    <div className="text-sm font-mono text-yellow-400">{detail.p95}ms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground">P99</div>
                    <div className="text-sm font-mono text-red-400">{detail.p99}ms</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
