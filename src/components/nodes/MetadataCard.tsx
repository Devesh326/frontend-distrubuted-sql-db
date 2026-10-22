import { NodePowerButton } from './NodePowerButton'
import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Database, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MetadataNodeInfo } from '@/types'
import { useClusterStore } from '@/store/clusterStore'
import { freshRecovery } from '@/services/recoveryState'

interface MetadataCardData {
  metaNode: MetadataNodeInfo
  currentTerm: number
  isHighlighted?: boolean
  isDimmed?: boolean
}

export function MetadataCard({ data }: NodeProps<MetadataCardData>) {
  const { metaNode, currentTerm, isHighlighted, isDimmed } = data
  const snapshotKnown = useClusterStore(s => s.connectionStatus === 'connected' && !!s.cluster.metadataCluster?.nodes.some(node => node.id === metaNode.id))
  const recovery = useClusterStore(s => s.recovery?.targets.find(node => node.id === metaNode.id))
  const received = useClusterStore(s => s.recoveryReceivedAt)
  const known = snapshotKnown || !!recovery && freshRecovery(recovery, received, Date.now())
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: isDimmed ? 0.35 : 1,
      }}
      whileHover={{
        y: -4,
        scale: isDimmed ? 1 : 1.02,
        transition: { duration: 0.2 },
      }}
      className={cn(
        'w-44 rounded-xl border bg-card p-3 transition-all duration-300 cursor-pointer',
        metaNode.isLeader
          ? 'border-amber-400 node-glow-green animate-breathe'
          : metaNode.healthy
            ? 'border-border/60 hover:border-amber-400/30'
            : 'border-red-900/60 node-glow-red',
        isDimmed && 'grayscale',
        isHighlighted && 'border-primary'
      )}
      title="Reported metadata peer status; reachability does not prove quorum."
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500/50 !w-2 !h-2 !border-0" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center',
            metaNode.isLeader ? 'bg-amber-500/20' : 'bg-secondary'
          )}>
            <Database size={14} className={metaNode.isLeader ? 'text-amber-400' : 'text-muted-foreground'} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">{metaNode.id}</span>
              {metaNode.isLeader && known && (
                <span className="text-[9px] font-medium text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">
                  LEADER
                </span>
              )}
              {!metaNode.isLeader && metaNode.healthy && known && currentTerm > 0 && (
                <span className="text-[9px] font-medium text-muted-foreground bg-secondary px-1 py-0.5 rounded">
                  FOLLOWER
                </span>
              )}
              {metaNode.healthy && known && !currentTerm && <span className="text-[9px] text-muted-foreground">MEMBER</span>}
              {!metaNode.healthy && known && (
                <span className="text-[9px] font-medium text-red-400 bg-red-500/10 px-1 py-0.5 rounded">
                  DOWN
                </span>
              )}
              {!known && <span className="text-[9px] text-muted-foreground">UNKNOWN</span>}
            </div>
          </div>
        </div>
<div className="flex items-center gap-2"><NodePowerButton nodeId={metaNode.id} role="metadata"/>        <div className={cn('w-1.5 h-1.5 rounded-full', !known ? 'bg-amber-500' : metaNode.healthy ? 'bg-green-500' : 'bg-red-500')} /></div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield size={10} />
        <span>{currentTerm ? `Term ${currentTerm}` : 'Term not reported'}</span>
      </div>
    </motion.div>
  )
}
