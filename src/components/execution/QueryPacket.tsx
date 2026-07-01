import { motion } from 'framer-motion'
import { NODE_POSITIONS } from './ClusterVisualization'
import { useClusterStore } from '@/store/clusterStore'
import type { PacketTarget } from '@/types'

function getNodeCenter(target: PacketTarget): { x: number; y: number } | null {
  if (!target) return null
  const pos = NODE_POSITIONS[target]
  if (!pos) return null
  return { x: Math.round(pos.x + 90), y: Math.round(pos.y + 24) }
}

export function QueryPacket() {
  const packetTarget = useClusterStore((s) => s.packetTarget)
  const currentQueryType = useClusterStore((s) => s.currentQueryType)
  const currentStepIndex = useClusterStore((s) => s.currentStepIndex)
  const executionSteps = useClusterStore((s) => s.executionSteps)

  if (currentStepIndex < 0 || currentStepIndex >= executionSteps.length) return null

  const step = executionSteps[currentStepIndex]
  const target = packetTarget as PacketTarget
  const pos = getNodeCenter(target)

  if (!pos) return null

  const typeColors: Record<string, string> = {
    SELECT: '#22d3ee',
    INSERT: '#34d399',
    UPDATE: '#fbbf24',
    DELETE: '#f472b6',
    COUNT: '#a78bfa',
    JOIN: '#fb923c',
  }

  const color = currentQueryType ? typeColors[currentQueryType] || '#22d3ee' : '#22d3ee'

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ zIndex: 10, width: 100, marginLeft: -50, marginTop: -20 }}
      initial={false}
      animate={{ left: pos.x, top: pos.y }}
      transition={{ type: 'spring', damping: 24, stiffness: 160, mass: 0.6 }}
    >
      <div
        className="relative flex flex-col items-center"
        style={{
          filter: `drop-shadow(0 0 12px ${color}88) drop-shadow(0 0 4px ${color}44)`,
        }}
      >
        <motion.div
          className="rounded-lg px-2.5 py-1.5 text-center min-w-[72px]"
          style={{
            backgroundColor: `${color}18`,
            border: `1px solid ${color}55`,
          }}
          animate={{
            boxShadow: [
              `0 0 8px ${color}44`,
              `0 0 16px ${color}88`,
              `0 0 8px ${color}44`,
            ],
          }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <span className="text-[10px] font-bold leading-tight block whitespace-pre" style={{ color }}>
            {step.packetLabel || step.id}
          </span>
        </motion.div>

        <motion.div
          className="absolute -bottom-[3px] w-2 h-2 rotate-45"
          style={{
            backgroundColor: `${color}18`,
            borderRight: `1px solid ${color}55`,
            borderBottom: `1px solid ${color}55`,
          }}
        />
      </div>

      {/* trail glow */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2"
        style={{
          left: -20,
          width: 16,
          height: 2,
          borderRadius: 1,
          background: `linear-gradient(90deg, transparent, ${color}44)`,
        }}
        initial={false}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
    </motion.div>
  )
}
