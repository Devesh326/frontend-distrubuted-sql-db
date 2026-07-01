import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClusterStore } from '@/store/clusterStore'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

const typeColors: Record<string, string> = {
  SELECT: 'text-cyan-400 bg-cyan-500/10',
  INSERT: 'text-green-400 bg-green-500/10',
  UPDATE: 'text-yellow-400 bg-yellow-500/10',
  DELETE: 'text-pink-400 bg-pink-500/10',
  COUNT: 'text-purple-400 bg-purple-500/10',
  JOIN: 'text-orange-400 bg-orange-500/10',
}

export function QueryHistory() {
  const queryHistory = useClusterStore((s) => s.queryHistory)
  const [expanded, setExpanded] = useState(false)

  if (queryHistory.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-[10px] text-muted-foreground">No query history yet</p>
      </div>
    )
  }

  const visible = expanded ? queryHistory : queryHistory.slice(-3)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          History ({queryHistory.length})
        </span>
        {queryHistory.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {expanded ? <>Less <ChevronUp size={10} /></> : <>More <ChevronDown size={10} /></>}
          </button>
        )}
      </div>

      <AnimatePresence>
        <div className="space-y-1">
          {visible.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20"
            >
              <span className={cn('text-[9px] font-semibold px-1 rounded', typeColors[entry.type])}>
                {entry.type}
              </span>
              <span className="text-[10px] text-foreground/60 font-mono flex-1 truncate">
                {entry.query.split('\n')[0].slice(0, 40)}...
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {(entry.duration / 1000).toFixed(1)}s
              </span>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  )
}
