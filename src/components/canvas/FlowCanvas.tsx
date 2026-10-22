import { useMemo, useCallback, useEffect, useRef } from 'react'
import ReactFlow, { Background, Controls, useReactFlow, useNodesState, BackgroundVariant, type NodeMouseHandler } from 'reactflow'
import 'reactflow/dist/style.css'
import { useClusterStore } from '@/store/clusterStore'
import { CoordinatorCard } from '@/components/nodes/CoordinatorCard'
import { StorageNodeCard } from '@/components/nodes/StorageNodeCard'
import { NginxCard } from '@/components/nodes/NginxCard'
import { MetadataCard } from '@/components/nodes/MetadataCard'
import { buildTopology } from './topology'
import { withRecoveryMembers } from '@/services/recoveryState'

const nodeTypes = { nginx: NginxCard, coordinator: CoordinatorCard, metadata: MetadataCard, storageNode: StorageNodeCard }

function FlowCanvasInner() {
  const sourceCluster = useClusterStore(s => s.cluster)
  const recovery = useClusterStore(s => s.recovery)
  const recoveryReceivedAt = useClusterStore(s => s.recoveryReceivedAt)
  const settings = useClusterStore(s => s.settings)
  const status = useClusterStore(s => s.connectionStatus)
  const cluster = useMemo(() => withRecoveryMembers(sourceCluster, recovery, status === 'connected', recoveryReceivedAt, Date.now()), [sourceCluster, recovery, status, recoveryReceivedAt])
  const select = useClusterStore(s => s.setSelectedNodeId)
  const open = useClusterStore(s => s.setDrawerOpen)
  const setType = useClusterStore(s => s.setDrawerType)
  const { fitView } = useReactFlow()
  const frame = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!frame.current) return
    const observer = new ResizeObserver(() => { void fitView({padding: 0.2, duration: 150}) })
    observer.observe(frame.current)
    return () => observer.disconnect()
  }, [fitView])
  const hasMetadata = !!cluster.metadataCluster
  const model = useMemo(() => buildTopology(cluster, settings.packetAnimation && status === 'connected'), [cluster, settings.packetAnimation, status])
  const [nodes, setNodes, onNodesChange] = useNodesState(model.nodes)
  useEffect(() => {
    setNodes(current => {
      const changedGroups = new Set(model.nodes.filter(node => node.type === 'storageNode' && current.some(previous => previous.id === node.id && previous.data.node.isLeader !== node.data.node.isLeader)).map(node => node.data.shardId))
      return model.nodes.map(node => {
        const previous = current.find(item => item.id === node.id)
        return previous && !settings.autoLayout && !(node.type === 'storageNode' && changedGroups.has(node.data.shardId)) ? { ...node, position: previous.position } : node
      })
    })
  }, [model.nodes, settings.autoLayout, setNodes])
  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.25, duration: 300 }), 150)
    return () => clearTimeout(timer)
  }, [cluster.nodes.length, cluster.coordinators.length, hasMetadata, fitView])
  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    if (node.type !== 'coordinator' && node.type !== 'storageNode' && node.type !== 'metadata') return
    select(node.type === 'coordinator' ? node.id : node.type === 'metadata' ? node.data.metaNode.id : node.data.node.id)
    setType(node.type === 'coordinator' ? 'coordinator' : node.type === 'metadata' ? 'metadata' : 'node')
    open(true)
  }, [select, setType, open])
  return (
    <div ref={frame} className="relative w-full h-full">
      <ReactFlow nodes={nodes} edges={model.edges} onNodesChange={onNodesChange} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.25 }} minZoom={0.2} maxZoom={2} proOptions={{ hideAttribution: true }} onNodeClick={onNodeClick}>
        {settings.gridVisibility && <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(240, 5%, 12%)"/>}
        <Controls showInteractive={false} className="!bg-card !border-border !rounded-lg"/>
      </ReactFlow>
      <div className="absolute top-3 left-3 pointer-events-none text-[10px] text-muted-foreground bg-card/90 rounded px-2 py-1 max-w-[80%]">
        {status === 'connected' ? 'Reported topology · links show configured relationships, not live traffic' : 'Last known topology · current health is unknown'}
        {status === 'connected' && cluster.shards.map(shard => <div key={shard.id}>Shard {shard.id}: {shard.leader ? `leader ${shard.leader}` : 'no leader observed'}</div>)}
      </div>
    </div>
  )
}
export function FlowCanvas() {
  const nodes = useClusterStore(s => s.cluster.nodes)
  const status = useClusterStore(s => s.connectionStatus)
  const error = useClusterStore(s => s.connectionError)
  const managed = useClusterStore(s => s.recovery?.targets.length || 0)
  if (!nodes.length && !managed) return (
    <div className="w-full h-full flex items-center justify-center">
      <div role="status" className="text-muted-foreground text-xs text-center px-5">
        {status === 'loading' ? 'Connecting to cluster…' : status === 'connected' ? 'No storage nodes reported yet.' : 'Backend status unavailable. Retrying automatically.'}
        {error && <p className="text-[10px] mt-2 max-w-lg">{error}</p>}
      </div>
    </div>
  )
  return <FlowCanvasInner/>
}
