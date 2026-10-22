import type { Node, Edge, MarkerType } from 'reactflow'
import type { ClusterState, StorageNode } from '@/types'

export function buildTopology(cluster: ClusterState, animate: boolean): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [{ id: 'nginx', type: 'nginx', position: { x: 0, y: 0 }, data: {} }]
  const edges: Edge[] = []
  const addEdge = (id: string, source: string, target: string, color: string, active = false, label?: string) => edges.push({
    id, source, target, type: 'smoothstep', animated: animate && active,
    style: { stroke: color, strokeWidth: 1.5, opacity: 0.5 },
    markerEnd: { type: 'arrowclosed' as MarkerType, color },
    label, labelStyle: { fontSize: 10, fill: color },
    labelBgStyle: { fill: 'hsl(240, 10%, 5.9%)', fillOpacity: 0.9 },
  })
  const coordinators = cluster.coordinators.length ? cluster.coordinators : cluster.coordinator.id ? [cluster.coordinator] : []
  nodes[0].data = { coordinators: coordinators.map(coordinator => coordinator.name) }
  coordinators.forEach((coordinator, index) => {
    nodes.push({ id: coordinator.id, type: 'coordinator', position: { x: (index - (coordinators.length - 1) / 2) * 400, y: 130 }, data: { coordinator } })
    addEdge(`nginx-${coordinator.id}`, 'nginx', coordinator.id, 'hsl(40, 80%, 55%)', false)
  })
  const metadata = cluster.metadataCluster?.nodes || []
  metadata.forEach((member, index) => {
    nodes.push({ id: `meta-${member.id}`, type: 'metadata', position: { x: (index - (metadata.length - 1) / 2) * 300, y: 280 }, data: { metaNode: member, currentTerm: cluster.metadataCluster?.currentTerm || 0 } })
    coordinators.forEach(coordinator => addEdge(`${coordinator.id}-${member.id}`, coordinator.id, `meta-${member.id}`, 'hsl(240, 5%, 35%)'))
    if (metadata.length > 1) addEdge(`meta-ring-${index}`, `meta-${member.id}`, `meta-${metadata[(index + 1) % metadata.length].id}`, 'hsl(40, 60%, 50%)')
  })
  cluster.shards.forEach((shard, index) => {
    const center = (index - (cluster.shards.length - 1) / 2) * 560
    const color = index % 2 ? 'hsl(320, 80%, 60%)' : 'hsl(190, 80%, 55%)'
    const hasLeader = shard.replicas.includes(shard.leader) && cluster.nodes.some(node => node.id === shard.leader)
    const replicas = [...new Set(shard.replicas)]
    const followers = replicas.filter(id => !hasLeader || id !== shard.leader)
    replicas.forEach(id => {
      const reported = cluster.nodes.find(node => node.id === id)
      const leader = hasLeader && id === shard.leader
      const node: StorageNode = reported ? { ...reported, isLeader: leader && reported.alive } : { id, name: id, address: '', port: 0, alive: false, isLeader: false, shardCount: 0, shardRoles: [] }
      const nodeID = `shard-${shard.id}-${id}`
      nodes.push({ id: nodeID, type: 'storageNode', position: { x: leader ? center : center + (followers.indexOf(id) - (followers.length - 1) / 2) * 280, y: leader ? 440 : 620 }, data: { node, shardId: shard.id, reported: !!reported } })
      if (leader) {
        coordinators.forEach(coordinator => addEdge(`${coordinator.id}-shard-${shard.id}`, coordinator.id, nodeID, color, false, `Shard ${shard.id}`))
      } else if (hasLeader) {
        addEdge(`replica-${shard.id}-${id}`, `shard-${shard.id}-${shard.leader}`, nodeID, color, false, `Shard ${shard.id} replica`)
      }
    })
  })
  const assigned = new Set(cluster.shards.flatMap(shard => shard.replicas))
  cluster.nodes.filter(node => !assigned.has(node.id)).forEach((node, index) => {
    nodes.push({id: `unassigned-${node.id}`, type: 'storageNode', position: {x: index * 280, y: 440}, data: {node, reported: !!node.address}})
  })
  return { nodes, edges }
}
