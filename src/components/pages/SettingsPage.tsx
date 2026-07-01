import { motion } from 'framer-motion'
import { Zap, Eye, Grid3X3, Navigation, Maximize2 } from 'lucide-react'
import { useClusterStore } from '@/store/clusterStore'
import type { SettingsState } from '@/types'

interface SettingRowProps {
  icon: React.ReactNode
  label: string
  description: string
  control: React.ReactNode
  index?: number
}

function SettingRow({ icon, label, description, control, index = 0 }: SettingRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <span className="text-xs font-medium text-foreground">{label}</span>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {control}
    </motion.div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
        value ? 'bg-primary' : 'bg-secondary'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
          value ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0.25}
        max={2}
        step={0.25}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-20 h-1 bg-secondary rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />
      <span className="text-[11px] font-mono text-muted-foreground w-8">{value}x</span>
    </div>
  )
}

export function SettingsPage() {
  const settings = useClusterStore((s) => s.settings)
  const updateSetting = useClusterStore((s) => s.updateSetting)

  const settingsRows: SettingRowProps[] = [
    {
      icon: <Zap size={16} />,
      label: 'Animation Speed',
      description: 'Controls the speed of all cluster animations',
      control: <Slider value={settings.animationSpeed} onChange={(v) => updateSetting('animationSpeed', v)} />,
    },
    {
      icon: <Eye size={16} />,
      label: 'Packet Animation',
      description: 'Show animated packets between nodes',
      control: (
        <Toggle value={settings.packetAnimation} onChange={(v) => updateSetting('packetAnimation', v)} />
      ),
    },
    {
      icon: <Grid3X3 size={16} />,
      label: 'Grid Visibility',
      description: 'Toggle grid background in topology view',
      control: (
        <Toggle value={settings.gridVisibility} onChange={(v) => updateSetting('gridVisibility', v)} />
      ),
    },
    {
      icon: <Maximize2 size={16} />,
      label: 'Leader Highlight',
      description: 'Emphasize the current leader node',
      control: (
        <Toggle value={settings.leaderHighlight} onChange={(v) => updateSetting('leaderHighlight', v)} />
      ),
    },
    {
      icon: <Navigation size={16} />,
      label: 'Auto Layout',
      description: 'Automatically arrange nodes in topology',
      control: <Toggle value={settings.autoLayout} onChange={(v) => updateSetting('autoLayout', v)} />,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-auto p-4"
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Settings</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Configure playground behavior</p>
      </div>
      <div className="flex flex-col gap-2 max-w-lg">
        {settingsRows.map((row, i) => (
          <SettingRow key={row.label} {...row} index={i} />
        ))}
      </div>
    </motion.div>
  )
}
