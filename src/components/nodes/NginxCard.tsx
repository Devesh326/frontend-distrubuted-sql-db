import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Network } from 'lucide-react'

export function NginxCard({ data }: NodeProps<{ coordinators?: string[] }>) {
  const coordinators = data.coordinators || []
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-48 rounded-xl border border-amber-500/30 bg-card p-3"
    >
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Network size={14} className="text-amber-400" />
        </div>
        <div>
          <span className="text-sm font-semibold text-foreground">NGINX</span>
          <span className="text-[9px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">
            LB
          </span>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground">
        {coordinators.length > 0
          ? coordinators.join(' · ')
          : 'No coordinators'}
      </div>
    </motion.div>
  )
}
