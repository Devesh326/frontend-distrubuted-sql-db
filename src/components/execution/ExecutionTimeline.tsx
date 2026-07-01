import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useClusterStore } from '@/store/clusterStore'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

export function ExecutionTimeline() {
  const executionSteps = useClusterStore((s) => s.executionSteps)
  const currentStepIndex = useClusterStore((s) => s.currentStepIndex)
  const activeRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current
      const el = activeRef.current
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      if (elRect.bottom > containerRect.bottom || elRect.top < containerRect.top) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentStepIndex])

  if (executionSteps.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-[10px] text-muted-foreground">Run a query to see execution steps</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-0.5 max-h-[200px] overflow-y-auto pr-1">
      {executionSteps.map((step, i) => {
        const isPast = i < currentStepIndex
        const isCurrent = i === currentStepIndex
        const isFuture = i > currentStepIndex

        return (
          <motion.div
            key={step.id}
            ref={isCurrent ? activeRef : undefined}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded transition-colors',
              isCurrent && 'bg-primary/10',
              isPast && 'opacity-80',
              isFuture && 'opacity-30'
            )}
          >
            {isPast && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
            {isCurrent && <Loader2 size={12} className="text-primary animate-spin shrink-0" />}
            {isFuture && <Circle size={12} className="text-muted-foreground shrink-0" />}

            <span
              className={cn(
                'text-[10px] font-mono transition-colors',
                isCurrent && 'text-primary font-medium',
                isPast && 'text-foreground/70',
                isFuture && 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
