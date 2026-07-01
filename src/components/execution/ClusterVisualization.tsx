import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Server, Share2 } from 'lucide-react'
import { useClusterStore } from '@/store/clusterStore'
import { cn } from '@/lib/utils'

export interface NodePos {
  x: number
  y: number
}

export const NODE_POSITIONS: Record<string, NodePos> = {
  client: { x: 5, y: 36 },
  coordinator: { x: 180, y: 20 },
  leader: { x: 180, y: 120 },
  replica1: { x: 60, y: 220 },
  replica2: { x: 300, y: 220 },
}

export function ClusterVisualization() {
  const cluster = useClusterStore((s) => s.cluster)
  const highlightedNode = useClusterStore((s) => s.highlightedNode)

  const nodes = useMemo(() => {
    const leader = cluster.nodes.find((n) => n.isLeader)
    const replicas = cluster.nodes.filter((n) => !n.isLeader)
    return { leader, replicas }
  }, [cluster])

  return (
    <div className="relative w-full flex-1 min-h-[300px]">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <linearGradient id="lineGradCoord" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.3)" />
            <stop offset="100%" stopColor="rgba(168, 85, 247, 0.1)" />
          </linearGradient>
          <linearGradient id="lineGradLeader" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0, 255, 136, 0.3)" />
            <stop offset="100%" stopColor="rgba(0, 255, 136, 0.1)" />
          </linearGradient>
        </defs>

        <line x1={NODE_POSITIONS.coordinator.x + 90} y1={NODE_POSITIONS.coordinator.y + 38}
              x2={NODE_POSITIONS.leader.x + 90} y2={NODE_POSITIONS.leader.y}
              stroke="url(#lineGradCoord)" strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={NODE_POSITIONS.leader.x + 90} y1={NODE_POSITIONS.leader.y + 38}
              x2={NODE_POSITIONS.replica1.x + 90} y2={NODE_POSITIONS.replica1.y}
              stroke="url(#lineGradLeader)" strokeWidth={1} strokeDasharray="3 3" opacity={0.3} />
        <line x1={NODE_POSITIONS.leader.x + 90} y1={NODE_POSITIONS.leader.y + 38}
              x2={NODE_POSITIONS.replica2.x + 90} y2={NODE_POSITIONS.replica2.y}
              stroke="url(#lineGradLeader)" strokeWidth={1} strokeDasharray="3 3" opacity={0.3} />
      </svg>

      <MiniNode
        label={cluster.coordinator.name}
        sublabel={`:${cluster.coordinator.port}`}
        position={NODE_POSITIONS.coordinator}
        badge="COORD"
        badgeColor="text-purple-400"
        badgeBg="bg-purple-500/10"
        icon={<Share2 size={14} className="text-purple-400" />}
        highlight={highlightedNode === 'coordinator'}
        hColor="rgba(168, 85, 247, 0.4)"
      />

      {nodes.leader && (
        <MiniNode
          label={nodes.leader.name}
          sublabel={`:${nodes.leader.port}`}
          position={NODE_POSITIONS.leader}
          badge="LEADER"
          badgeColor="text-primary"
          badgeBg="bg-primary/10"
          icon={<Server size={14} className="text-primary" />}
          highlight={highlightedNode === 'leader'}
          hColor="rgba(0, 255, 136, 0.4)"
        />
      )}

      {nodes.replicas[0] && (
        <MiniNode
          label={nodes.replicas[0].name}
          sublabel={`:${nodes.replicas[0].port}`}
          position={NODE_POSITIONS.replica1}
          badge="REPLICA"
          badgeColor="text-blue-400"
          badgeBg="bg-blue-500/10"
          icon={<Server size={14} className="text-blue-400" />}
          highlight={highlightedNode === 'replica1'}
          hColor="rgba(96, 165, 250, 0.4)"
        />
      )}

      {nodes.replicas[1] && (
        <MiniNode
          label={nodes.replicas[1].name}
          sublabel={`:${nodes.replicas[1].port}`}
          position={NODE_POSITIONS.replica2}
          badge="REPLICA"
          badgeColor="text-blue-400"
          badgeBg="bg-blue-500/10"
          icon={<Server size={14} className="text-blue-400" />}
          highlight={highlightedNode === 'replica2'}
          hColor="rgba(96, 165, 250, 0.4)"
        />
      )}
    </div>
  )
}

function MiniNode({
  label, sublabel, position, badge, badgeColor, badgeBg, icon, highlight, hColor,
}: {
  label: string; sublabel: string; position: NodePos
  badge: string; badgeColor: string; badgeBg: string
  icon: React.ReactNode; highlight: boolean; hColor: string
}) {
  return (
    <motion.div
      className={cn(
        'absolute flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-colors',
        highlight ? 'border-white/40 bg-muted/40' : 'border-border/60 bg-card/80'
      )}
      style={{
        left: position.x,
        top: position.y,
        width: 180,
        zIndex: highlight ? 5 : 1,
        boxShadow: highlight ? `0 0 20px ${hColor}` : undefined,
      }}
      animate={highlight ? { scale: [1, 1.04, 1], transition: { duration: 0.8, repeat: Infinity } } : { scale: 1 }}
    >
      <div className={cn('w-6 h-6 rounded flex items-center justify-center', badgeBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-foreground truncate">{label}</span>
          <span className={cn('text-[8px] font-medium px-1 rounded', badgeColor, badgeBg)}>{badge}</span>
        </div>
        <span className="text-[9px] text-muted-foreground font-mono">{sublabel}</span>
      </div>
    </motion.div>
  )
}
