import { useMemo, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import { useClusterStore } from '@/store/clusterStore'
import { CoordinatorCard } from '@/components/nodes/CoordinatorCard'
import { StorageNodeCard } from '@/components/nodes/StorageNodeCard'

const nodeTypes = {
  coordinator: CoordinatorCard,
  storageNode: StorageNodeCard,
}

const NODE_WIDTH = 256
const NODE_HEIGHT = 140
const VERTICAL_GAP = 160

const nodeIdMap: Record<string, string> = {
  coordinator: 'coord-1',
  leader: 'node-1',
  replica1: 'node-2',
  replica2: 'node-3',
}

function FlowContent() {
  const cluster = useClusterStore((s) => s.cluster)
  const highlightedNode = useClusterStore((s) => s.highlightedNode)
  const isExecuting = useClusterStore((s) => s.isExecuting)
  const packetTarget = useClusterStore((s) => s.packetTarget)
  const cameraTargetNode = useClusterStore((s) => s.cameraTargetNode)
  const completionPhase = useClusterStore((s) => s.completionPhase)
  const cinematicMode = useClusterStore((s) => s.cinematicMode)
  const reactFlowInstance = useReactFlow()

  const prevTargetRef = useRef<string | null>(null)
  const [packetPos, setPacketPos] = useState<{ x: number; y: number } | null>(null)
  const [prevPacketPos, setPrevPacketPos] = useState<{ x: number; y: number } | null>(null)
  const [trailPositions, setTrailPositions] = useState<{ x: number; y: number }[]>([])

  const { nodes, edges } = useMemo(() => {
    const n: Node[] = []
    const e: Edge[] = []

    const isHighlighted = (id: string) => {
      if (!isExecuting || !highlightedNode) return false
      return nodeIdMap[highlightedNode] === id
    }
    const isDimmed = (id: string) => {
      if (!isExecuting || !highlightedNode) return false
      return nodeIdMap[highlightedNode] !== id
    }

    n.push({
      id: cluster.coordinator.id,
      type: 'coordinator',
      position: { x: 0, y: 0 },
      data: { coordinator: cluster.coordinator, isHighlighted: isHighlighted(cluster.coordinator.id), isDimmed: isDimmed(cluster.coordinator.id) },
    })

    cluster.nodes.forEach((node, i) => {
      const offset = (i - (cluster.nodes.length - 1) / 2) * 340
      n.push({
        id: node.id,
        type: 'storageNode',
        position: { x: offset, y: 280 },
        data: { node, isHighlighted: isHighlighted(node.id), isDimmed: isDimmed(node.id) },
      })

      e.push({
        id: `edge-${cluster.coordinator.id}-${node.id}`,
        source: cluster.coordinator.id,
        target: node.id,
        type: 'smoothstep',
        animated: isExecuting && (nodeIdMap[highlightedNode || ''] === node.id || nodeIdMap[highlightedNode || ''] === cluster.coordinator.id),
        style: {
          stroke: isHighlighted(node.id) ? 'hsl(142, 70%, 60%)' : isDimmed(node.id) ? 'hsl(240, 5%, 20%)' : node.isLeader ? 'hsl(142, 70%, 50%)' : 'hsl(240, 5%, 40%)',
          strokeWidth: isHighlighted(node.id) ? 3 : isDimmed(node.id) ? 0.8 : node.isLeader ? 2.5 : 1.5,
          opacity: isDimmed(node.id) ? 0.15 : isHighlighted(node.id) ? 1 : node.isLeader ? 0.8 : 0.4,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHighlighted(node.id) ? 'hsl(142, 70%, 60%)' : isDimmed(node.id) ? 'hsl(240, 5%, 20%)' : node.isLeader ? 'hsl(142, 70%, 50%)' : 'hsl(240, 5%, 40%)',
        },
      })

      if (node.isLeader) {
        cluster.nodes.filter((o) => o.id !== node.id).forEach((replica) => {
          e.push({
            id: `edge-replication-${node.id}-${replica.id}`,
            source: node.id,
            target: replica.id,
            type: 'smoothstep',
            animated: isExecuting && (highlightedNode === 'replica1' || highlightedNode === 'replica2'),
            style: {
              stroke: isExecuting && (highlightedNode === 'replica1' || highlightedNode === 'replica2') ? 'hsl(142, 70%, 50%)' : 'hsl(240, 5%, 30%)',
              strokeWidth: isExecuting && (highlightedNode === 'replica1' || highlightedNode === 'replica2') ? 2 : 1,
              opacity: isExecuting && (highlightedNode === 'replica1' || highlightedNode === 'replica2') ? 0.6 : 0.15,
              strokeDasharray: '4 4',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isExecuting && (highlightedNode === 'replica1' || highlightedNode === 'replica2') ? 'hsl(142, 70%, 50%)' : 'hsl(240, 5%, 30%)',
            },
          })
        })
      }
    })

    return { nodes: n, edges: e }
  }, [cluster, highlightedNode, isExecuting])

  useEffect(() => {
    if (!cameraTargetNode || !reactFlowInstance) return
    if (!cinematicMode) return
    const node = reactFlowInstance.getNodes().find((n) => n.id === cameraTargetNode)
    if (node) {
      reactFlowInstance.setCenter(
        node.position.x + NODE_WIDTH / 2,
        node.position.y + NODE_HEIGHT / 2,
        { zoom: 1, duration: 500 }
      )
    }
  }, [cameraTargetNode, reactFlowInstance, cinematicMode])

  useEffect(() => {
    if (!packetTarget || !reactFlowInstance) {
      setPacketPos(null)
      setPrevPacketPos(null)
      return
    }

    const nodeId = nodeIdMap[packetTarget]
    const node = reactFlowInstance.getNodes().find((n) => n.id === nodeId)
    if (!node) return

    const { x: vx, y: vy, zoom } = reactFlowInstance.getViewport()
    const screenX = (node.position.x + NODE_WIDTH / 2) * zoom + vx
    const screenY = (node.position.y + NODE_HEIGHT / 2) * zoom + vy

    const newPos = { x: screenX, y: screenY }

    if (prevTargetRef.current && prevTargetRef.current !== packetTarget) {
      setPrevPacketPos(packetPos)
      setTrailPositions((prev) => {
        const updated = packetPos ? [...prev, packetPos] : prev
        return updated.slice(-8)
      })
      setTimeout(() => setTrailPositions([]), 1500)
    }

    prevTargetRef.current = packetTarget
    setPacketPos(newPos)
  }, [packetTarget, reactFlowInstance])

  const typeColors: Record<string, string> = {
    SELECT: '#22d3ee', INSERT: '#34d399', UPDATE: '#fbbf24',
    DELETE: '#f472b6', COUNT: '#a78bfa', JOIN: '#fb923c',
  }

  const currentQueryType = useClusterStore((s) => s.currentQueryType)
  const currentStepIndex = useClusterStore((s) => s.currentStepIndex)
  const executionSteps = useClusterStore((s) => s.executionSteps)
  const step = currentStepIndex >= 0 && currentStepIndex < executionSteps.length ? executionSteps[currentStepIndex] : null
  const color = currentQueryType ? typeColors[currentQueryType] || '#22d3ee' : '#22d3ee'

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.3}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: 'hsl(240, 5%, 40%)', strokeWidth: 1.5 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="hsl(240, 5%, 10%)" />
        <Controls
          showInteractive={false}
          className="!bg-card !border-border !rounded-lg"
        />
      </ReactFlow>

      <AnimatePresence>
        {packetPos && step && (
          <motion.div
            key="query-packet"
            className="absolute pointer-events-none"
            style={{ zIndex: 50, width: 100, marginLeft: -50, marginTop: -20 }}
            initial={false}
            animate={{ left: packetPos.x, top: packetPos.y, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.35, ease: 'easeOut' } }}
            transition={{ type: 'spring', damping: 24, stiffness: 160, mass: 0.6 }}
          >
            <div
              className="relative flex flex-col items-center"
              style={{ filter: `drop-shadow(0 0 18px ${color}99) drop-shadow(0 0 6px ${color}55)` }}
            >
              <motion.div
                className="rounded-lg px-3 py-1.5 text-center min-w-[76px]"
                style={{
                  backgroundColor: `${color}1a`,
                  border: `1px solid ${color}55`,
                  backdropFilter: 'blur(4px)',
                }}
                animate={{
                  boxShadow: [`0 0 10px ${color}44`, `0 0 22px ${color}88`, `0 0 10px ${color}44`],
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
                  backgroundColor: `${color}1a`,
                  borderRight: `1px solid ${color}55`,
                  borderBottom: `1px solid ${color}55`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {packetPos && step && (
          <motion.div
            key="packet-trail"
            className="absolute pointer-events-none"
            style={{
              zIndex: 49,
              left: packetPos.x - 80,
              top: packetPos.y - 2,
              width: 60,
              height: 3,
              borderRadius: 2,
              background: `linear-gradient(270deg, ${color}66, transparent)`,
            }}
            initial={false}
            animate={{ opacity: [0, 0.7, 0] }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {prevPacketPos && packetPos && (
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 48 }}>
          <line
            x1={prevPacketPos.x}
            y1={prevPacketPos.y}
            x2={packetPos.x}
            y2={packetPos.y}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="4 6"
            opacity={0.3}
            style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
          />
        </svg>
      )}
    </div>
  )
}

export function ExecutionFlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowContent />
    </ReactFlowProvider>
  )
}
