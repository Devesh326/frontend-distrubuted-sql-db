import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Server, Cpu, HardDrive, Database, Wifi, Activity } from 'lucide-react'
import type { StorageNode } from '@/types'
import { cn } from '@/lib/utils'

interface StorageNodeCardData {
  node: StorageNode
  isHighlighted?: boolean
  isDimmed?: boolean
}

export function StorageNodeCard({ data }: NodeProps<StorageNodeCardData>) {
  const { node, isHighlighted, isDimmed } = data
  const isLeader = node.isLeader
  const isHealthy = node.health === 'healthy'

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
        'relative w-64 rounded-xl border bg-card p-4 transition-all duration-300 cursor-pointer',
        isHighlighted
          ? 'border-primary node-glow-green animate-breathe'
          : isLeader
            ? 'border-primary/40 node-glow-green'
            : isHealthy
              ? 'border-border/60 hover:border-primary/30 hover:node-glow-green'
              : 'border-red-900/60 node-glow-red',
        isDimmed && 'grayscale'
      )}
      title="Click for details"
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2 !border-0" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              isLeader ? 'bg-primary/20' : 'bg-secondary',
            )}
          >
            <Server size={16} className={isLeader ? 'text-primary' : 'text-muted-foreground'} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{node.name}</span>
              {isLeader && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  LEADER
                </span>
              )}
              {!isLeader && (
                <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  REPLICA
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              :{node.port}
            </span>
          </div>
        </div>
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            node.health === 'healthy' ? 'bg-green-500' : node.health === 'degraded' ? 'bg-yellow-500' : 'bg-red-500',
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground">CPU</span>
          <span className="text-foreground font-mono ml-auto">{node.cpu}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground">Mem</span>
          <span className="text-foreground font-mono ml-auto">{node.memory}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground">Storage</span>
          <span className="text-foreground font-mono ml-auto">{node.storage}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Database size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground">Shards</span>
          <span className="text-foreground font-mono ml-auto">{node.shardCount}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Wifi size={10} />
          {node.health}
        </span>
        <span className="text-[10px] text-muted-foreground">Click for details</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary/50 !w-2 !h-2 !border-0" />
    </motion.div>
  )
}
