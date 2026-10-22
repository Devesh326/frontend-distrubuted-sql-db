import { Power, Loader2 } from 'lucide-react'
import { useClusterStore } from '@/store/clusterStore'
import { freshRecovery } from '@/services/recoveryState'

export function NodePowerButton({nodeId, role}: {nodeId: string; role: 'storage' | 'coordinator' | 'metadata'}) {
 const state = useClusterStore()
 const target = state.recovery?.power_nodes?.find(node => node.id === nodeId)
 const known = target && state.recoveryStatus === 'connected' && freshRecovery(target, state.recoveryReceivedAt, Date.now())
 const action = target?.power === 'stopped' || target?.power === 'paused' ? 'start' : 'stop'
 const pending = !!state.powerPending[nodeId]
 const unlocked = !!state.controlToken && known && state.recovery?.experiments_enabled && ['running','stopped','paused'].includes(target?.power || '')
 const open = () => { state.setSelectedNodeId(nodeId); state.setDrawerType(role === 'storage' ? 'node' : role); state.setDrawerOpen(true) }
 const title = !unlocked ? `Power controls for ${nodeId}` : `${action === 'start' ? 'Start / resume' : 'Stop'} ${nodeId}`
 return <button type="button" aria-label={title} title={title} className={`nodrag nopan p-1 rounded transition-colors disabled:opacity-30 ${action === 'start' ? 'text-green-400 hover:bg-green-500/10' : 'text-muted-foreground hover:text-red-400 hover:bg-red-500/10'}`}
  disabled={pending}
  onClick={event => { event.stopPropagation(); open(); if (unlocked) void state.setNodePower(nodeId, action) }}>
  {pending ? <Loader2 size={14} className="animate-spin"/> : <Power size={14}/>}
 </button>
}
