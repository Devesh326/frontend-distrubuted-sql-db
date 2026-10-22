import { motion, AnimatePresence } from 'framer-motion'
import { X, Activity, Gauge, HeartPulse, Server, Layers } from 'lucide-react'
import { useClusterStore } from '@/store/clusterStore'
import type { Metrics } from '@/types'

const details = {
  queryCount: { label: 'Query Count', unit: 'queries', color: 'text-blue-400', icon: Activity, description: 'Measured queries on the responding coordinator since its process started; not a cluster-wide total.' },
  averageLatency: { label: 'Average Latency', unit: 'ms', color: 'text-yellow-400', icon: Gauge, description: 'Cumulative mean query duration on the responding coordinator. No samples means unavailable.' },
  clusterHealth: { label: 'Storage Availability', unit: '%', color: 'text-green-400', icon: HeartPulse, description: 'Reported live storage nodes divided by reported storage nodes. This does not prove Raft quorum or SQL readiness.' },
  nodesAlive: { label: 'Storage Nodes Alive', unit: 'nodes', color: 'text-cyan-400', icon: Server, description: 'Storage availability reported by the backend heartbeat monitor.' },
  shardCount: { label: 'Shard Count', unit: 'shards', color: 'text-purple-400', icon: Layers, description: 'Configured shards reported by metadata.' },
} as const

export function MetricDetailModal() {
  const key = useClusterStore(s => s.metricModalKey)
  const close = useClusterStore(s => s.setMetricModalKey)
  const metrics = useClusterStore(s => s.metrics)
  const history = useClusterStore(s => s.metricHistory)
  const status = useClusterStore(s => s.connectionStatus)
  if (!key || !(key in details)) return null
  const metricKey = key as keyof typeof details
  const detail = details[metricKey]
  const Icon = detail.icon
  const value = metrics[metricKey as keyof Metrics]
  const points = history.filter(sample => sample.coordinatorId === metrics.coordinatorId && sample[metricKey] !== null)
  const max = Math.max(1, ...points.map(sample => Number(sample[metricKey])))
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50" onClick={() => close(null)}/>
      <motion.div role="dialog" aria-label={detail.label} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[95vw] bg-card border border-border rounded-xl z-50 shadow-2xl">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2"><Icon size={14}/><span className="text-sm font-semibold">{detail.label}</span><span className={`text-lg font-bold font-mono ${detail.color}`}>{typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'} {detail.unit}</span></div>
          <button aria-label="Close metric details" onClick={() => close(null)} className="text-muted-foreground hover:text-foreground"><X size={16}/></button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>
          <p className="text-[10px] text-muted-foreground">{metrics.coordinatorId || 'No source yet'} · {status === 'connected' ? 'Latest observed sample' : 'Last known data / unavailable'}</p>
          <div className="h-40">
            {points.length ? <div className="flex items-end gap-[2px] h-full">{points.map((point, index) => <div key={index} className="flex-1 rounded-t bg-primary/20 hover:bg-primary/40" style={{ height: `${Math.max(1, Number(point[metricKey]) / max * 100)}%` }} title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point[metricKey]}`}/>)}</div>
              : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No measured samples yet</div>}
          </div>
          {points.length > 0 && <div className="flex justify-between text-[10px] text-muted-foreground"><span>{new Date(points[0].timestamp).toLocaleTimeString()}</span><span>{new Date(points[points.length - 1].timestamp).toLocaleTimeString()}</span></div>}
          {metricKey === 'averageLatency' && <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-center text-[10px] text-muted-foreground"><span>P95: Not reported</span><span>P99: Not reported</span></div>}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
