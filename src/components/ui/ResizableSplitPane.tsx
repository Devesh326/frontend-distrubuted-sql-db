import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ResizableSplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  defaultPercent?: number
  minPercent?: number
  maxPercent?: number
  className?: string
}

export function ResizableSplitPane({
  left,
  right,
  defaultPercent = 55,
  minPercent = 30,
  maxPercent = 75,
  className,
}: ResizableSplitPaneProps) {
  const [splitPercent, setSplitPercent] = useState(defaultPercent)
  const draggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    draggingRef.current = true
    const container = containerRef.current
    if (!container) return
    container.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = (x / rect.width) * 100
      setSplitPercent(Math.min(maxPercent, Math.max(minPercent, pct)))
    },
    [minPercent, maxPercent]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = false
    const container = containerRef.current
    if (container) container.releasePointerCapture(e.pointerId)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('flex gap-0 min-h-0 select-none', className)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="flex flex-col min-w-0" style={{ flexBasis: `${splitPercent}%` }}>
        {left}
      </div>

      <div
        className="relative shrink-0 cursor-col-resize"
        style={{ width: 8 }}
        onPointerDown={handlePointerDown}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group cursor-col-resize">
          <div className="absolute inset-y-0 -left-1 -right-1 transition-colors group-hover:bg-primary/20 cursor-col-resize" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-col-resize" />
      </div>

      <div className="flex flex-col min-w-0 flex-1" style={{ flexBasis: `${100 - splitPercent}%` }}>
        {right}
      </div>
    </div>
  )
}
