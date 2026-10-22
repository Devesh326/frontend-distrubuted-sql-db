import { useState } from 'react'
import { useClusterStore } from '@/store/clusterStore'
import { Power, Play } from 'lucide-react'
import { setRecoveryMode } from '@/services/api'
import { freshRecovery } from '@/services/recoveryState'

export function RecoveryPanel({ nodeId }: { nodeId: string }) {
  const recovery = useClusterStore(state => state.recovery)
  const status = useClusterStore(state => state.recoveryStatus)
  const receivedAt = useClusterStore(state => state.recoveryReceivedAt)
  const error = useClusterStore(state => state.recoveryError)
  const refresh = useClusterStore(state => state.refreshRecovery)
  const token = useClusterStore(s => s.controlToken)
  const setToken = useClusterStore(s => s.setControlToken)
  const powerNodes = useClusterStore(s => s.recovery?.power_nodes)
  const experiments = useClusterStore(s => s.recovery?.experiments_enabled)
  const powerPending = useClusterStore(s => !!s.powerPending[nodeId])
  const powerError = useClusterStore(s => s.powerErrors[nodeId])
  const setPower = useClusterStore(s => s.setNodePower)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const target = recovery?.targets.find(member => member.id === nodeId)
  const power = powerNodes?.find(node => node.id === nodeId)
  const powerKnown = power && status === 'connected' && freshRecovery(power, receivedAt, Date.now())
  const disabled = !token || pending || powerPending || !powerKnown || !experiments
  const lockReason = !token ? 'Controls are locked. Enter the token for this lab below.'
    : !experiments ? 'Power experiments are disabled in this environment.'
    : !powerKnown ? 'Waiting for fresh controller status. No power command can be sent yet.' : null
  const observed = target && status === 'connected' && freshRecovery(target, receivedAt, Date.now())
  const change = async (mode: 'hold' | 'automatic') => {
    if (!token || pending || powerPending || status !== 'connected') return
    setPending(true); setMessage(null)
    try {
      await setRecoveryMode(nodeId, mode, token)
      setMessage(mode === 'hold' ? 'Hold acknowledged. Automatic recovery is suspended for this member.' : 'Automatic recovery acknowledged. The retry budget is unchanged.')
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : String(failure)) }
    finally { await refresh(true); setPending(false) }
  }
  return (
    <section aria-label="Node controls" className="space-y-3 border border-border rounded-lg p-3">
      <div className="flex justify-between items-center"><h3 className="text-xs font-semibold">Node controls</h3><span className="text-[10px] font-mono text-muted-foreground">{powerKnown ? power.power : 'unknown / stale'}</span></div>
      <p className="text-[11px] text-muted-foreground">{nodeId.startsWith('storage-') ? 'Controls this physical node and every shard replica it hosts.' : 'Stop holds automatic recovery so this member stays off. Start resumes automatic recovery.'}</p>
      {lockReason && <p role="status" className="text-[11px] text-amber-400">{lockReason}</p>}
      <p className="text-[11px] text-muted-foreground">This is your local container-control password. Retrieve it in PowerShell:</p>
      <code className="block text-[10px] p-2 rounded bg-muted/30 break-all select-all">docker compose{recovery?.project ? ` -p ${recovery.project}` : ''} exec -T recovery cat /run/goquery-control/token</code>
      <label className="block text-[11px] text-muted-foreground">Lab control token
        <input aria-label="Lab control token" type="password" autoComplete="off" spellCheck={false} value={token} onChange={event => setToken(event.target.value)} className="block w-full mt-1 rounded-md border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"/>
      </label>
      <p className="text-[10px] text-muted-foreground">Unlock once for this tab. The token stays in memory and is cleared on reload.</p>
      {!experiments && <p className="text-[11px] text-amber-400">Power experiments are not enabled by this backend.</p>}
      <div className="grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-2 px-3 py-2 text-xs border border-border rounded-md text-red-400 hover:bg-red-500/10 disabled:opacity-35" disabled={disabled || !['running','paused'].includes(power?.power || '')} onClick={() => void setPower(nodeId,'stop')}><Power size={13}/>Stop node</button>
        <button className="flex items-center justify-center gap-2 px-3 py-2 text-xs border border-border rounded-md text-green-400 hover:bg-green-500/10 disabled:opacity-35" disabled={disabled || !['stopped','paused'].includes(power?.power || '')} onClick={() => void setPower(nodeId,'start')}><Play size={13}/>{power?.power === 'paused' ? 'Resume node' : 'Start node'}</button>
      </div>
      {powerPending && <p role="status" className="text-[11px] text-muted-foreground">Waiting for the backend…</p>}
      {powerError && <p role="alert" className="text-[11px] text-red-400 break-words">{powerError}</p>}
      {target && <>

      <h3 className="text-xs font-medium">Automatic Recovery</h3>
      <>
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/20 rounded p-2">
          <span className="text-muted-foreground">Mode</span><span>{target.mode === 'hold' ? 'Hold' : 'Automatic'}{status !== 'connected' && ' (last known)'}</span>
          <span className="text-muted-foreground">Process</span><span>{observed ? target.live ? 'Live' : 'Not live' : 'Unknown / stale'}</span>
          <span className="text-muted-foreground">Ready</span><span>{observed ? target.ready ? 'Yes' : 'No' : 'Unknown / stale'}</span>
          <span className="text-muted-foreground">Recovery state</span><span className="break-words">{target.phase.replace(/_/g, ' ')}</span>
          <span className="text-muted-foreground">Attempts since stable health</span><span>{target.attempts}</span>
        </div>
        {target.reason && <p className="text-[10px] text-muted-foreground break-words">{target.reason}</p>}
        {target.role === 'metadata' && <p className="text-[10px] text-muted-foreground">Metadata quorum: {status === 'connected' ? recovery?.metadata_quorum : 'unknown'}. Live does not mean quorum is available.</p>}
        <p className="text-[10px] text-muted-foreground">Hold suspends automatic recovery; it does not stop the process. Resume restores automatic recovery without resetting failed attempts.</p>
        <div className="flex gap-2">
          <button onClick={() => void change('hold')} disabled={!token || pending || powerPending || status !== 'connected' || target.mode === 'hold'} className="px-2 py-1.5 text-[11px] border border-border rounded hover:bg-muted/30 disabled:opacity-40">{pending ? 'Updating…' : 'Hold recovery'}</button>
          <button onClick={() => void change('automatic')} disabled={!token || pending || powerPending || status !== 'connected' || target.mode === 'automatic'} className="px-2 py-1.5 text-[11px] border border-border rounded hover:bg-muted/30 disabled:opacity-40">Resume automatic</button>
        </div>
      </>
      </>}
      {error && <p className="text-[10px] text-amber-400">Recovery status unavailable: {error}</p>}
      {message && <p role="status" className="text-[11px] text-muted-foreground">{message}</p>}
    </section>
  )
}
