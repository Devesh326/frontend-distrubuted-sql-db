import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Pause, Play, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClusterStore } from '@/store/clusterStore'
import { cn } from '@/lib/utils'

const levelColors: Record<string, string> = {
  error: 'text-red-400',
  warn: 'text-yellow-400',
  info: 'text-green-400',
  debug: 'text-muted-foreground',
}

export function LogsPage() {
  const logs = useClusterStore((s) => s.logs)
  const clearLogs = useClusterStore((s) => s.clearLogs)
  const logPaused = useClusterStore((s) => s.logPaused)
  const setLogPaused = useClusterStore((s) => s.setLogPaused)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!logPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, logPaused])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Cluster Logs</span>
          <span className="text-[10px] text-muted-foreground font-mono">{logs.length} entries</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLogPaused(!logPaused)}>
            {logPaused ? <Play size={14} /> : <Pause size={14} />}
            {logPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearLogs}>
            <Trash2 size={14} />
            Clear
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 rounded-xl border border-border bg-card overflow-auto font-mono text-[12px] leading-5"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No log entries
          </div>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                'flex items-start gap-3 px-3 py-1.5 border-b border-border/40 hover:bg-muted/20 transition-colors',
                entry.level === 'error' && 'bg-red-950/10'
              )}
            >
              <span className="text-muted-foreground shrink-0 w-20">{entry.timestamp}</span>
              <span className={cn('shrink-0 w-10 uppercase text-[10px] font-semibold', levelColors[entry.level])}>
                [{entry.level}]
              </span>
              <span className="text-foreground/90">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}
