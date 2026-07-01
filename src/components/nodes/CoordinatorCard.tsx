import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Share2, Wifi } from 'lucide-react'
import type { Coordinator } from '@/types'
import { cn } from '@/lib/utils'

interface CoordinatorCardData {
  coordinator: Coordinator
  isHighlighted?: boolean
  isDimmed?: boolean
}

export function CoordinatorCard({ data }: NodeProps<CoordinatorCardData>) {
  const { coordinator, isHighlighted, isDimmed } = data
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: isDimmed ? 0.35 : 1,
      }}
      whileHover={{
        y: -6,
        scale: isDimmed ? 1 : 1.02,
        transition: { duration: 0.2 },
      }}
      className={cn(
        'w-64 rounded-xl border bg-card p-4 transition-all duration-300 cursor-pointer',
        isHighlighted
          ? 'border-purple-400 node-glow-green animate-breathe'
          : 'border-purple-500/30 node-glow-green',
        isDimmed && 'grayscale'
      )}
      title="Click for details"
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-2 !h-2 !border-0" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Share2 size={16} className="text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{coordinator.name}</span>
              <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                COORDINATOR
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              :{coordinator.port}
            </span>
          </div>
        </div>
        <div className={cn('w-2 h-2 rounded-full', coordinator.health === 'healthy' ? 'bg-green-500' : 'bg-red-500')} />
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Wifi size={10} />
        {coordinator.health}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <span className="text-[10px] text-muted-foreground">Click for details</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-purple-500/50 !w-2 !h-2 !border-0" />
    </motion.div>
  )
}
