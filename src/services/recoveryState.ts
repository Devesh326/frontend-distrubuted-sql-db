import type { ClusterState, RecoverySnapshot, RecoveryTarget } from '@/types'

export function freshRecovery(target: Pick<RecoveryTarget, 'phase' | 'observed_at'>, receivedAt: number, now: number): boolean {
  const observed = Date.parse(target.observed_at)
  return target.phase !== 'stale' && Number.isFinite(observed) && now - observed <= 6000 && observed <= now + 1000 && receivedAt > 0 && now - receivedAt <= 6000
}
export function validateRecovery(snapshot: RecoverySnapshot, now = Date.now()): RecoverySnapshot {
  const observed = Date.parse(snapshot?.observed_at)
  if (!Number.isFinite(observed) || now - observed > 6000 || observed > now + 1000 || !Array.isArray(snapshot.targets)) throw new Error('Recovery status is stale or invalid.')
  const ids = new Set<string>()
  for (const target of snapshot.targets) {
    if (!target || !['automatic', 'hold'].includes(target.mode) || ids.has(target.id)
      || (target.role === 'metadata' ? !/^meta[123]$/.test(target.id) : target.role === 'coordinator' ? !/^coord-[12]$/.test(target.id) : true)
      || typeof target.phase !== 'string' || typeof target.live !== 'boolean' || typeof target.ready !== 'boolean'
      || !Number.isSafeInteger(target.attempts) || target.attempts < 0) throw new Error('Recovery target identity or state is invalid.')
    ids.add(target.id)
  }
  if (ids.size !== 5) throw new Error('Recovery status does not contain the five managed members.')
  if (snapshot.power_nodes !== undefined) {
    const powers = new Set<string>()
    for (const node of snapshot.power_nodes) {
      if (powers.has(node.id) || !['running','stopped','paused','restarting','unknown'].includes(node.power)
        || !(node.role === 'storage' ? /^storage-pool-[123]$/.test(node.id) : snapshot.targets.some(target => target.id === node.id && target.role === node.role))) throw new Error('Invalid node power state.')
      powers.add(node.id)
    }
  }
  return snapshot
}

// Recovery identifies original members even when coordinator SQL/status routing
// is unavailable. It cannot supply unseen storage topology or current leaders.
export function withRecoveryMembers(cluster: ClusterState, snapshot: RecoverySnapshot | null, snapshotFresh: boolean, receivedAt: number, now: number): ClusterState {
  if (!snapshot) return cluster
  const coordinators = snapshot.targets.filter(target => target.role === 'coordinator').map(target => {
    const previous = cluster.coordinators.find(node => node.id === target.id) || (cluster.coordinator.id === target.id ? cluster.coordinator : undefined)
    return { id: target.id, name: previous?.name || `Coordinator ${target.id}`, address: previous?.address || '', port: previous?.port || 0, healthy: freshRecovery(target, receivedAt, now) ? target.live : snapshotFresh && !!previous?.healthy }
  })
  const metadata = snapshot.targets.filter(target => target.role === 'metadata').map(target => {
    const previous = cluster.metadataCluster?.nodes.find(node => node.id === target.id)
    return { id: target.id, address: previous?.address || '', isLeader: snapshotFresh && !!previous?.isLeader, healthy: freshRecovery(target, receivedAt, now) ? target.live : snapshotFresh && !!previous?.healthy }
  })
  const nodes = [...cluster.nodes]
  for (const target of snapshot.power_nodes || []) {
    if (target.role === 'storage' && !nodes.some(node => node.id === target.id)) nodes.push({id: target.id, name: target.id, address: '', port: 0, alive: false, isLeader: false, shardCount: 0, shardRoles: []})
  }
  return { ...cluster, nodes, coordinators, metadataCluster: { nodes: metadata, leaderId: snapshotFresh ? cluster.metadataCluster?.leaderId || '' : '', currentTerm: snapshotFresh ? cluster.metadataCluster?.currentTerm || 0 : 0 } }
}
