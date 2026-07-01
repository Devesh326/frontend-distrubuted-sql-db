import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Copy, Eraser, Terminal, Sparkles, Maximize2, Minimize2, History, PanelRightClose, PanelRightOpen, ChevronDown, ChevronRight, Clock, BarChart3, Activity, ListTree } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClusterStore } from '@/store/clusterStore'
import { useExecutionEngine } from '@/components/execution/ExecutionEngine'
import { ExecutionFlowCanvas } from '@/components/execution/ExecutionFlowCanvas'
import { ExecutionTimeline } from '@/components/execution/ExecutionTimeline'
import { QueryHistory } from '@/components/execution/QueryHistory'
import { PlaybackControls } from '@/components/execution/PlaybackControls'
import { cn } from '@/lib/utils'

const DEFAULT_QUERY = `SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > 100
ORDER BY o.total DESC
LIMIT 10;`

const sampleQueries = [
  { label: 'SELECT', query: 'SELECT * FROM users WHERE id = 42;' },
  { label: 'INSERT', query: "INSERT INTO orders (user_id, total) VALUES (12, 99.50);" },
  { label: 'UPDATE', query: "UPDATE inventory SET stock = stock - 1 WHERE sku = 'ABC-123';" },
  { label: 'DELETE', query: 'DELETE FROM sessions WHERE expires_at < NOW();' },
  { label: 'COUNT', query: 'SELECT COUNT(*) FROM users;' },
  { label: 'JOIN', query: 'SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id;' },
]

const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'ORDER BY', 'LIMIT', 'DESC', 'ASC', 'AND', 'OR', 'IN', 'NOT', 'AS', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'HAVING', 'GROUP BY', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'INTO', 'VALUES', 'SET', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'TRUE', 'FALSE', 'UNION', 'ALL', 'EXISTS']

function highlightSQL(text: string): React.ReactNode {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  let result = escaped
  for (const kw of sqlKeywords.sort((a, b) => b.length - a.length)) {
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\b(${escapedKw})\\b`, 'gi'), (match) =>
      `<span class="text-purple-400">${match}</span>`
    )
  }
  result = result.replace(/(`[^`]+`)/g, '<span class="text-amber-400">$1</span>')
  result = result.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="text-green-400">$1</span>')
  result = result.replace(/(--.*)/g, '<span class="text-muted-foreground italic">$1</span>')
  return <span dangerouslySetInnerHTML={{ __html: result }} />
}

function CollapsibleSection({ icon: Icon, label, defaultOpen = true, children }: { icon: React.ElementType; label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <Icon size={12} className="shrink-0" />
        <span className="uppercase tracking-wider">{label}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={label}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FullscreenSidePanel() {
  const isExecuting = useClusterStore((s) => s.isExecuting)
  const currentQueryType = useClusterStore((s) => s.currentQueryType)
  const executionSteps = useClusterStore((s) => s.executionSteps)
  const executionProgress = useClusterStore((s) => s.executionProgress)
  const queryHistory = useClusterStore((s) => s.queryHistory)
  const [open, setOpen] = useState(true)

  const durations = executionSteps.map((s) => s.duration)
  const totalDuration = durations.reduce((a, b) => a + b, 0)
  const stepCount = executionSteps.length

  return (
    <div className={cn(
      'flex flex-col border-l border-border bg-card/50 transition-all duration-300',
      open ? 'w-64' : 'w-9'
    )}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center h-8 border-b border-border text-muted-foreground hover:text-foreground transition-colors"
        title={open ? 'Collapse panel' : 'Expand panel'}
      >
        {open ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
      </button>

      {open && (
        <div className="flex-1 overflow-y-auto">
          <CollapsibleSection icon={ListTree} label="Execution Steps" defaultOpen={true}>
            <ExecutionTimeline />
          </CollapsibleSection>

          <CollapsibleSection icon={Clock} label="Query Metadata" defaultOpen={false}>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground font-mono">{currentQueryType || '—'}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground font-mono">{executionProgress}%</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Total Steps</span>
                <span className="text-foreground font-mono">{stepCount || '—'}</span>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection icon={BarChart3} label="Execution Statistics" defaultOpen={false}>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Est. Duration</span>
                <span className="text-foreground font-mono">{(totalDuration / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">History</span>
                <span className="text-foreground font-mono">{queryHistory.length} queries</span>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection icon={Activity} label="Trace Events" defaultOpen={false}>
            <p className="text-[10px] text-muted-foreground italic">OpenTelemetry traces will appear here</p>
          </CollapsibleSection>
        </div>
      )}
    </div>
  )
}

function VizPanelContent({ onFullscreen }: { onFullscreen?: () => void }) {
  const isExecuting = useClusterStore((s) => s.isExecuting)
  const executionSteps = useClusterStore((s) => s.executionSteps)
  const executionProgress = useClusterStore((s) => s.executionProgress)
  const currentQueryType = useClusterStore((s) => s.currentQueryType)
  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className={cn(isExecuting ? 'text-primary animate-pulse' : 'text-muted-foreground')} />
            <span className="text-xs font-semibold text-foreground">Execution Visualization</span>
          </div>
          {isExecuting && (
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded animate-pulse font-medium">
              {currentQueryType} · {executionProgress}%
            </span>
          )}
          {!isExecuting && currentQueryType && (
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-medium">
              {currentQueryType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PlaybackControls />
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              'text-[10px] font-mono px-2 py-1 rounded border transition-colors',
              showHistory
                ? 'border-primary/30 text-primary bg-primary/10'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <History size={13} className="inline mr-1" />
            History
          </button>
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <ExecutionFlowCanvas />
        </div>
        <div className="w-48 shrink-0 border-l border-border overflow-y-auto bg-card/30">
          <div className="px-2 py-2">
            {showHistory ? (
              <>
                <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Query History</div>
                <QueryHistory />
              </>
            ) : (
              <>
                <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Execution Steps</div>
                <ExecutionTimeline />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PlaygroundPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [toast, setToast] = useState<string | null>(null)
  const [vizFullscreen, setVizFullscreen] = useState(false)
  const [editorHeight, setEditorHeight] = useState(180)
  const resizingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isExecuting = useClusterStore((s) => s.isExecuting)
  const executionProgress = useClusterStore((s) => s.executionProgress)
  const currentQueryType = useClusterStore((s) => s.currentQueryType)

  const { startExecution, parseQuery } = useExecutionEngine()

  useEffect(() => {
    if (!vizFullscreen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVizFullscreen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [vizFullscreen])

  const showToast = useCallback((msg: string, duration = 2500) => {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }, [])

  const handleRun = useCallback(() => {
    if (isExecuting) return
    const trimmed = query.trim()
    if (!trimmed) {
      showToast('Please enter a SQL query')
      return
    }
    const type = parseQuery(trimmed)
    if (type) showToast(`Running ${type} query...`, 800)
    startExecution(trimmed)
  }, [query, isExecuting, startExecution, parseQuery, showToast])

  const handleClear = useCallback(() => setQuery(''), [])
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(query)
    showToast('Query copied to clipboard', 2000)
  }, [query, showToast])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRun()
      }
    },
    [handleRun]
  )

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    resizingRef.current = true
    const container = containerRef.current
    if (container) container.setPointerCapture(e.pointerId)
  }, [])

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizingRef.current) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top
    setEditorHeight(Math.min(400, Math.max(100, y)))
  }, [])

  const handleResizeUp = useCallback((e: React.PointerEvent) => {
    resizingRef.current = false
    const container = containerRef.current
    if (container) container.releasePointerCapture(e.pointerId)
  }, [])

  const lineCount = query.split('\n').length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-card/50">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">SQL Playground</span>
          <span className="text-[9px] text-muted-foreground font-mono hidden sm:inline">Ctrl+Enter to run</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            {sampleQueries.slice(0, 4).map((sq) => (
              <button
                key={sq.label}
                onClick={() => setQuery(sq.query)}
                className={cn(
                  'text-[10px] font-mono px-2 py-0.5 rounded border transition-colors',
                  query === sq.query
                    ? 'border-primary/40 text-primary bg-primary/10'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {sq.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={isExecuting}>
            <Copy size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={isExecuting}>
            <Eraser size={14} />
          </Button>
          <Button size="sm" onClick={handleRun} disabled={isExecuting}>
            {isExecuting ? (
              <>
                <svg className="animate-spin w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {executionProgress}%
              </>
            ) : (
              <><Play size={14} /> Run</>
            )}
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 flex flex-col min-h-0 px-4 pb-4 gap-0"
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeUp}
        onPointerCancel={handleResizeUp}
      >
        <div
          className="flex flex-col rounded-xl border border-border overflow-hidden bg-card mt-3 shrink-0"
          style={{ height: editorHeight }}
        >
          <div className="flex items-center gap-2 px-3 py-1 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[10px] text-muted-foreground font-mono">query.sql</span>
          </div>
          <div className="flex-1 flex relative overflow-hidden">
            <div className="w-10 shrink-0 border-r border-border bg-muted/20 text-right pr-2 pt-2.5 font-mono text-[11px] leading-5 text-muted-foreground select-none">
              {Array.from({ length: Math.max(lineCount, 5) }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 left-10 resize-none bg-transparent text-transparent caret-foreground font-mono text-[13px] leading-5 p-3 outline-none z-10"
              spellCheck={false}
            />
            <pre className="flex-1 p-3 font-mono text-[13px] leading-5 overflow-auto pointer-events-none">
              {highlightSQL(query || ' ')}
              <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
            </pre>
          </div>
        </div>

        <div
          className="relative cursor-row-resize shrink-0 group"
          style={{ height: 6 }}
          onPointerDown={handleResizeStart}
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
        </div>

        <div className="flex-1 min-h-0">
          <VizPanelContent onFullscreen={() => setVizFullscreen(true)} />
        </div>
      </div>

      <AnimatePresence>
        {vizFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-background"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">Execution Visualization</span>
                {isExecuting && (
                  <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded animate-pulse font-medium">
                    {currentQueryType} · {executionProgress}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground font-mono max-w-[160px] truncate hidden md:inline-block">{query}</span>
                <Button size="sm" onClick={handleRun} disabled={isExecuting}>
                  {isExecuting ? (
                    <><svg className="animate-spin w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{executionProgress}%</>
                  ) : (
                    <><Play size={14} /> Run</>
                  )}
                </Button>
                <PlaybackControls />
                <button
                  onClick={() => setVizFullscreen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Exit fullscreen (ESC)"
                >
                  <Minimize2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 relative">
                <ExecutionFlowCanvas />
              </div>
              <FullscreenSidePanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow-lg"
        >
          {toast}
        </motion.div>
      )}
    </motion.div>
  )
}
