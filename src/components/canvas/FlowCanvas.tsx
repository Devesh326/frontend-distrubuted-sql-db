import { useMemo, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
  type NodeMouseHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useClusterStore } from '@/store/clusterStore'
import { CoordinatorCard } from '@/components/nodes/CoordinatorCard'
import { StorageNodeCard } from '@/components/nodes/StorageNodeCard'

const nodeTypes = {
  coordinator: CoordinatorCard,
  storageNode: StorageNodeCard,
}

export function FlowCanvas() {
  const cluster = useClusterStore((s) => s.cluster)
  const settings = useClusterStore((s) => s.settings)
  const setSelectedNodeId = useClusterStore((s) => s.setSelectedNodeId)
  const setDrawerOpen = useClusterStore((s) => s.setDrawerOpen)
  const setDrawerType = useClusterStore((s) => s.setDrawerType)

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (node.type === 'coordinator') {
        setDrawerType('coordinator')
      } else {
        setSelectedNodeId(node.id)
        setDrawerType('node')
      }
      setDrawerOpen(true)
    },
    [setSelectedNodeId, setDrawerOpen, setDrawerType]
  )

  const { nodes, edges } = useMemo(() => {
    const n: Node[] = []
    const e: Edge[] = []

    n.push({
      id: cluster.coordinator.id,
      type: 'coordinator',
      position: { x: 0, y: 0 },
      data: { coordinator: cluster.coordinator },
    })

    cluster.nodes.forEach((node, i) => {
      const offset = (i - (cluster.nodes.length - 1) / 2) * 320
      n.push({
        id: node.id,
        type: 'storageNode',
        position: { x: offset, y: 280 },
        data: { node },
      })

      e.push({
        id: `edge-${cluster.coordinator.id}-${node.id}`,
        source: cluster.coordinator.id,
        target: node.id,
        type: 'smoothstep',
        animated: node.isLeader,
        style: {
          stroke: node.isLeader ? 'hsl(142, 70%, 50%)' : 'hsl(240, 5%, 40%)',
          strokeWidth: node.isLeader ? 2.5 : 1.5,
          opacity: node.isLeader ? 0.8 : 0.4,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: node.isLeader ? 'hsl(142, 70%, 50%)' : 'hsl(240, 5%, 40%)',
        },
        label: node.isLeader ? 'leader' : undefined,
        labelStyle: {
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          fill: node.isLeader ? 'hsl(142, 70%, 50%)' : 'hsl(240, 5%, 64.9%)',
        },
        labelBgStyle: { fill: 'hsl(240, 10%, 5.9%)', fillOpacity: 0.9 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 3,
      })

      if (node.isLeader) {
        cluster.nodes
          .filter((other) => other.id !== node.id)
          .forEach((replica) => {
            e.push({
              id: `edge-replication-${node.id}-${replica.id}`,
              source: node.id,
              target: replica.id,
              type: 'smoothstep',
              animated: settings.packetAnimation,
              style: {
                stroke: 'hsl(240, 5%, 30%)',
                strokeWidth: 1,
                opacity: 0.25,
                strokeDasharray: '4 4',
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: 'hsl(240, 5%, 30%)',
              },
            })
          })
      }
    })

    return { nodes: n, edges: e }
  }, [cluster, settings.packetAnimation])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.5}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      onNodeClick={onNodeClick}
      defaultEdgeOptions={{
        type: 'smoothstep',
        style: { stroke: 'hsl(240, 5%, 40%)', strokeWidth: 1.5 },
      }}
    >
      {settings.gridVisibility && (
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(240, 5%, 12%)" />
      )}
      <Controls
        showInteractive={false}
        className="!bg-card !border-border !rounded-lg"
      />
    </ReactFlow>
  )
}
