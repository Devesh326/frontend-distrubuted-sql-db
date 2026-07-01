import { useClusterStore } from '@/store/clusterStore'
import { cn } from '@/lib/utils'

const speeds = [
  { label: '🐢 Slow', value: 0.5 },
  { label: '▶ Normal', value: 1 },
  { label: '⚡ Fast', value: 2 },
]

export function PlaybackControls() {
  const simulationSpeed = useClusterStore((s) => s.simulationSpeed)
  const setSimulationSpeed = useClusterStore((s) => s.setSimulationSpeed)
  const cinematicMode = useClusterStore((s) => s.cinematicMode)
  const setCinematicMode = useClusterStore((s) => s.setCinematicMode)

  return (
    <div className="flex items-center gap-1">
      {speeds.map((s) => (
        <button
          key={s.value}
          onClick={() => {
            setSimulationSpeed(s.value)
            if (cinematicMode) setCinematicMode(false)
          }}
          className={cn(
            'text-[10px] font-mono px-2 py-1 rounded transition-colors whitespace-nowrap',
            simulationSpeed === s.value && !cinematicMode
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border'
          )}
        >
          {s.label}
        </button>
      ))}
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        onClick={() => setCinematicMode(!cinematicMode)}
        className={cn(
          'text-[10px] font-mono px-2 py-1 rounded transition-colors whitespace-nowrap',
          cinematicMode
            ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
            : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border'
        )}
      >
        🎬 Cinematic
      </button>
    </div>
  )
}
