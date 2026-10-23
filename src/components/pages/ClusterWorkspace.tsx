import { useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react'
import { FlowCanvas } from '@/components/canvas/FlowCanvas'
import { QueryConsole } from './QueryConsole'

export function ClusterWorkspace() {
  const [consoleOpen, setConsoleOpen] = useState(true)
  return <div className="h-full flex flex-col min-h-0">
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0 bg-card/50">
      <div className="min-w-0">
        <h1 className="text-xs font-semibold">Cluster playground</h1>
        <p className="text-[10px] text-muted-foreground">Change a node, run SQL, see the impact.</p>
      </div>
      <button aria-expanded={consoleOpen} aria-controls="query-console" onClick={() => setConsoleOpen(!consoleOpen)} className="flex items-center gap-1 text-[11px] text-primary shrink-0 px-2 py-1 rounded hover:bg-primary/10">
        <Terminal size={13}/>{consoleOpen ? 'Hide SQL' : 'Show SQL'}{consoleOpen ? <ChevronDown size={13}/> : <ChevronUp size={13}/>}
      </button>
    </div>
    <div className="flex-1 min-h-0 flex flex-col xl:flex-row">
      <section aria-label="Live cluster" className="flex-1 min-h-0 min-w-0 relative">
        <ReactFlowProvider><FlowCanvas/></ReactFlowProvider>
      </section>
      {/* Keep the console mounted: hiding it must not cancel a submitted query. */}
      <section id="query-console" aria-label="SQL console" hidden={!consoleOpen} className={consoleOpen ? 'h-[46%] min-h-[240px] xl:h-auto xl:min-h-0 xl:w-[440px] shrink-0 border-t xl:border-t-0 xl:border-l border-border bg-card/50' : 'hidden'}>
        <QueryConsole/>
      </section>
    </div>
  </div>
}
