import { ReactFlowProvider } from 'reactflow'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MetricsBar } from '@/components/layout/MetricsBar'
import { FlowCanvas } from '@/components/canvas/FlowCanvas'
import { PlaygroundPage } from '@/components/pages/PlaygroundPage'
import { MetricsPage } from '@/components/pages/MetricsPage'
import { LogsPage } from '@/components/pages/LogsPage'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { NodeDrawer } from '@/components/panels/NodeDrawer'
import { CoordinatorDrawer } from '@/components/panels/CoordinatorDrawer'
import { MetricDetailModal } from '@/components/panels/MetricDetailModal'
import { useClusterStore } from '@/store/clusterStore'

const pages: Record<string, React.FC> = {
  cluster: () => (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  ),
  playground: PlaygroundPage,
  metrics: MetricsPage,
  logs: LogsPage,
  settings: SettingsPage,
}

function PageContent({ view }: { view: string }) {
  const Page = pages[view] || pages.cluster

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
      >
        <Page />
      </motion.div>
    </AnimatePresence>
  )
}

function App() {
  const sidebarView = useClusterStore((s) => s.sidebarView)

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative">
          <PageContent view={sidebarView} />
        </main>
      </div>
      <MetricsBar />
      <NodeDrawer />
      <CoordinatorDrawer />
      <MetricDetailModal />
    </div>
  )
}

export default App
