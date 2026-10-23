import { useState } from 'react'
import { Copy, Eraser, Play, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClusterStore } from '@/store/clusterStore'
import { useExecutionEngine } from '@/components/execution/ExecutionEngine'
import { ExecutionTimeline } from '@/components/execution/ExecutionTimeline'
import { PlaybackControls } from '@/components/execution/PlaybackControls'
import { QueryHistory } from '@/components/execution/QueryHistory'
import { ResultTable } from './PlaygroundPage'
import { cn } from '@/lib/utils'

const samples = [
  {label: 'SELECT', query: 'SELECT * FROM users;'},
  {label: 'INSERT', query: "INSERT INTO users (name) VALUES ('hello');"},
  {label: 'UPDATE', query: "UPDATE users SET name = 'updated' WHERE id = 42;"},
  {label: 'DELETE', query: 'DELETE FROM users WHERE id = 42;'},
]
const tabs = ['Results', 'Execution', 'History'] as const

export function QueryConsole() {
  const query = useClusterStore(s => s.playgroundQuery)
  const setQuery = useClusterStore(s => s.setPlaygroundQuery)
  const running = useClusterStore(s => s.isExecuting)
  const phase = useClusterStore(s => s.executionPhase)
  const result = useClusterStore(s => s.queryResult)
  const error = useClusterStore(s => s.queryError)
  const duration = useClusterStore(s => s.lastQueryDurationMs)
  const coordinator = useClusterStore(s => s.executionCoordinatorId)
  const notice = useClusterStore(s => s.executionNotice)
  const {startExecution} = useExecutionEngine()
  const [tab, setTab] = useState<typeof tabs[number]>('Results')
  const [copyNotice, setCopyNotice] = useState('')
  const run = () => {
    if (running || !query.trim()) return
    setTab('Results')
    void startExecution(query.trim())
  }
  return <div className="h-full min-h-0 flex flex-col">
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 shrink-0">
      <div className="flex items-center gap-2 text-xs font-semibold"><Terminal size={14} className="text-primary"/>SQL console<span className="hidden sm:inline text-[9px] text-muted-foreground font-normal">Ctrl+Enter</span></div>
      <div className="flex items-center gap-1">
        <button aria-label="Copy SQL" title="Copy SQL" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => {void navigator.clipboard.writeText(query).then(() => setCopyNotice('SQL copied.')).catch(() => setCopyNotice('Could not copy SQL.'))}}><Copy size={13}/></button>
        <button aria-label="Clear SQL" title="Clear SQL" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => setQuery('')}><Eraser size={13}/></button>
        <Button size="sm" onClick={run} disabled={running || !query.trim()}><Play size={13}/>{running ? phase === 'waiting' ? 'Waiting…' : 'Replaying…' : 'Run SQL'}</Button>
      </div>
    </div>
    <div className="flex items-center gap-1 px-3 pb-1 shrink-0">
      {samples.map(sample => <button key={sample.label} onClick={() => setQuery(sample.query)} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground">{sample.label}</button>)}
      <span className="text-[9px] text-muted-foreground ml-auto">users(id, name)</span>
    </div>
    <textarea aria-label="SQL query" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {event.preventDefault(); run()}}} spellCheck={false} className="mx-3 mb-1.5 h-16 xl:h-28 min-h-12 shrink-0 resize-y rounded-lg border border-border bg-background px-3 py-2 text-[12px] leading-5 font-mono text-foreground outline-none focus:border-primary/50"/>
    <div role="tablist" aria-label="Query output" className="flex items-center gap-1 px-3 border-y border-border shrink-0">
      {tabs.map(item => <button key={item} id={`output-${item}`} role="tab" aria-selected={tab === item} aria-controls={`panel-${item}`} onClick={() => setTab(item)} className={cn('px-2 py-1.5 text-[10px] border-b-2',tab === item ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>{item}</button>)}
    </div>
    <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`output-${tab}`} className="flex-1 min-h-0 overflow-auto px-3 py-2">
      {tab === 'Results' && <>
        {phase === 'waiting' && <p role="status" className="text-xs text-primary">Waiting for the backend response…</p>}
        {error && <p role="alert" className="text-xs text-red-400 whitespace-pre-wrap break-words">{error}</p>}
        {result !== null && <>
          <p className="text-[10px] text-muted-foreground mb-1">Last response · {duration}ms{coordinator ? ` · ${coordinator}` : ''} · {result.length} rows</p>
          <ResultTable rows={result}/>
        </>}
        {result === null && !error && phase !== 'waiting' && <p className="text-[11px] text-muted-foreground">Run SQL, change a node in the graph, then run it again to compare the outcome.</p>}
        {copyNotice && <p role="status" className="text-[10px] text-muted-foreground mt-2">{copyNotice}</p>}
      </>}
      {tab === 'Execution' && <>
        <p className="text-[10px] text-muted-foreground mb-2">Recorded steps from the last request. Replay affects the display only.</p>
        <PlaybackControls showCinematic={false}/>
        {notice && <p className="text-[10px] text-muted-foreground my-2">{notice}</p>}
        <ExecutionTimeline/>
      </>}
      {tab === 'History' && <QueryHistory/>}
    </div>
  </div>
}
