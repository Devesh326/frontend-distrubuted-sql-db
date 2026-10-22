import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useClusterStore } from '@/store/clusterStore'
import { chartSamples } from '@/services/metricsData'

const chartConfigs = [
  { title: 'CPU Usage', dataKey: null, color: '#22d3ee', unit: '%', note: 'CPU telemetry is not reported by this API.' },
  { title: 'Memory Usage', dataKey: null, color: '#a78bfa', unit: '%', note: 'Memory telemetry is not reported by this API.' },
  { title: 'Query Throughput', dataKey: 'throughput', color: '#34d399', unit: 'q/s', note: 'Waiting for two samples from the same coordinator.' },
  { title: 'Average Latency', dataKey: 'averageLatency', color: '#fbbf24', unit: 'ms', note: 'No measured latency samples yet.' },
  { title: 'Replication Activity', dataKey: null, color: '#f472b6', unit: 'evt/s', note: 'Replication event rates are not reported by this API.' },
] as const

export function MetricsPage() {
  const history = useClusterStore(s => s.metricHistory)
  const source = useClusterStore(s => s.metrics.coordinatorId)
  const status = useClusterStore(s => s.connectionStatus)
  const data = chartSamples(history, source)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="h-full overflow-auto p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Cluster Metrics</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {source ? `Queries: ${source}, since its process started. History is collected in this browser session.` : 'Waiting for a backend status snapshot.'}
          {status === 'stale' && ' Last known samples; status is stale.'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {chartConfigs.map((config, index) => {
          const key = config.dataKey
          const available = key !== null && data.some(point => point[key] !== null)
          return (
            <motion.div key={config.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.4 }} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-foreground">{config.title}</span>
                <span className="text-[11px] font-mono text-muted-foreground">{config.unit}</span>
              </div>
              <div className="h-32">
                {available && key ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <defs><linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={config.color} stopOpacity={0.18}/><stop offset="100%" stopColor={config.color} stopOpacity={0.01}/></linearGradient></defs>
                      <XAxis dataKey="time" tick={false} axisLine={false}/><YAxis tick={false} axisLine={false}/>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(240, 10%, 5.9%)', border: '1px solid hsl(240, 3.7%, 15.9%)', borderRadius: 8, fontSize: 12 }}/>
                      <Area type="linear" dataKey={key} stroke={config.color} strokeWidth={2} fill={`url(#grad-${index})`} connectNulls={false} isAnimationActive={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-center text-[11px] text-muted-foreground px-3">{config.note}</div>}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
