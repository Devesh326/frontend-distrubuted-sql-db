import { freshRecovery } from '@/services/recoveryState'
import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Server, Database, Wifi, Activity } from 'lucide-react'
import type { StorageNode } from '@/types'
import { NodePowerButton } from './NodePowerButton'
import { cn } from '@/lib/utils'
import { useClusterStore } from '@/store/clusterStore'

interface StorageNodeCardData {
  node: StorageNode
  isHighlighted?: boolean
  isDimmed?: boolean
  shardId?: number
  reported?: boolean
}

export function StorageNodeCard({ data }: NodeProps<StorageNodeCardData>) {
  const { node, isHighlighted, isDimmed, shardId } = data
  const status = useClusterStore((s) => s.connectionStatus)
  const leaderHighlight = useClusterStore((s) => s.settings.leaderHighlight)
  const animationSpeed = useClusterStore((s) => s.settings.animationSpeed)
  const power = useClusterStore(s => s.recovery?.power_nodes?.find(n => n.id === node.id))
  const received = useClusterStore(s => s.recoveryReceivedAt)
  const unavailable = !!power && freshRecovery(power, received, Date.now()) && ['paused','stopped'].includes(power.power)
  const known = status === 'connected' && data.reported !== false || unavailable
  const term = useClusterStore(s => s.cluster.shardRaftDetail.find(group => group.shardId === shardId)?.term)

  const isHealthy = !unavailable && node.alive
  const isLeader = node.isLeader && isHealthy && status === 'connected'

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
        'relative w-64 rounded-xl border bg-card p-4 transition-all cursor-pointer',
        isHighlighted
          ? 'border-primary node-glow-green animate-breathe'
          : !known ? 'border-border/60 opacity-60' : isLeader && leaderHighlight
            ? 'border-primary/40 node-glow-green'
            : isHealthy
              ? 'border-border/60 hover:border-primary/30 hover:node-glow-green'
              : 'border-red-900/60 node-glow-red',
        isDimmed && 'grayscale'
      )}
      style={{ transitionDuration: `${300 / animationSpeed}ms` }}
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
              {isLeader && known && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  LEADER
                </span>
              )}
              {!isLeader && isHealthy && known && (
                <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  REPLICA
                </span>
              )}
              {!isHealthy && known && (
                <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                  {unavailable ? power?.power.toUpperCase() : 'DOWN'}
                </span>
              )}
              {!known && <span className="text-[9px] text-muted-foreground">UNKNOWN</span>}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {node.port ? `:${node.port}` : 'Port not reported'}{shardId !== undefined && ` · Shard ${shardId}`}{known && term ? ` · group term ${term}` : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NodePowerButton nodeId={node.id} role="storage"/>
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              !known ? 'bg-amber-500' : isHealthy ? 'bg-green-500' : 'bg-red-500',
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground">Shards</span>
          <span className="text-foreground font-mono ml-auto">{node.shardCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Database size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground">Port</span>
          <span className="text-foreground font-mono ml-auto">{node.port}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Wifi size={10} />
          {!known ? 'last known / unknown' : isHealthy ? 'reported online' : 'reported down'}
        </span>
        <span className="text-[10px] text-muted-foreground">Click for details</span>
      </div>


      <Handle type="source" position={Position.Bottom} className="!bg-primary/50 !w-2 !h-2 !border-0" />
    </motion.div>
  )
}
