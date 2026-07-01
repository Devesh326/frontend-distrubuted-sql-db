import { motion } from 'framer-motion'
import {
  Database,
  Play,
  BarChart3,
  ScrollText,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClusterStore } from '@/store/clusterStore'
import type { SidebarView } from '@/types'

const navItems: { id: SidebarView; label: string; icon: React.ReactNode }[] = [
  { id: 'cluster', label: 'Cluster', icon: <Database size={18} /> },
  { id: 'playground', label: 'Playground', icon: <Play size={18} /> },
  { id: 'metrics', label: 'Metrics', icon: <BarChart3 size={18} /> },
  { id: 'logs', label: 'Logs', icon: <ScrollText size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
]

export function Sidebar() {
  const sidebarView = useClusterStore((s) => s.sidebarView)
  const setSidebarView = useClusterStore((s) => s.setSidebarView)

  return (
    <aside className="w-56 border-r border-border bg-sidebar flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Database size={14} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Distributed SQL
          </span>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-3">
        {navItems.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Button
              variant={sidebarView === item.id ? 'sidebarActive' : 'sidebar'}
              size="default"
              onClick={() => setSidebarView(item.id)}
            >
              {item.icon}
              {item.label}
            </Button>
          </motion.div>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-soft" />
          v1.0.0
        </div>
      </div>
    </aside>
  )
}
