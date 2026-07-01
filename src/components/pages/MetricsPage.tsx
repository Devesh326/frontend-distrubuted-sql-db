import { motion } from 'framer-motion'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const chartData = Array.from({ length: 20 }, (_, i) => ({
  time: `T${i * 5}`,
  cpu: 30 + Math.sin(i * 0.6) * 15 + Math.random() * 10,
  mem: 55 + Math.sin(i * 0.4 + 1) * 10 + Math.random() * 8,
  throughput: Math.floor(200 + Math.sin(i * 0.7) * 80 + Math.random() * 60),
  latency: Math.max(0.5, 2 + Math.sin(i * 0.5 + 2) * 1 + Math.random() * 1.2),
  replication: Math.floor(5 + Math.sin(i * 0.3 + 3) * 3 + Math.random() * 4),
}))

const chartConfigs = [
  { title: 'CPU Usage', dataKey: 'cpu', color: '#22d3ee', unit: '%', gradient: ['#22d3ee20', '#22d3ee02'] },
  { title: 'Memory Usage', dataKey: 'mem', color: '#a78bfa', unit: '%', gradient: ['#a78bfa20', '#a78bfa02'] },
  { title: 'Query Throughput', dataKey: 'throughput', color: '#34d399', unit: 'q/s', gradient: ['#34d39920', '#34d39902'] },
  { title: 'Latency', dataKey: 'latency', color: '#fbbf24', unit: 'ms', gradient: ['#fbbf2420', '#fbbf2402'] },
  { title: 'Replication Activity', dataKey: 'replication', color: '#f472b6', unit: 'evt/s', gradient: ['#f472b620', '#f472b602'] },
]

function ChartCard({ config, index }: { config: typeof chartConfigs[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-foreground">{config.title}</span>
        <span className="text-[11px] font-mono text-muted-foreground">{config.unit}</span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.gradient[0]} />
                <stop offset="100%" stopColor={config.gradient[1]} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={false} axisLine={false} />
            <YAxis tick={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(240, 10%, 5.9%)',
                border: '1px solid hsl(240, 3.7%, 15.9%)',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono',
              }}
              labelStyle={{ color: 'hsl(240, 5%, 64.9%)' }}
            />
            <Area
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#grad-${index})`}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

export function MetricsPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-auto p-4"
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Cluster Metrics</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Real-time metrics from all cluster nodes</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {chartConfigs.map((config, i) => (
          <ChartCard key={config.title} config={config} index={i} />
        ))}
      </div>
    </motion.div>
  )
}
