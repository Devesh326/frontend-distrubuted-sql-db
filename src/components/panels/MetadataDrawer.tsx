import { motion, AnimatePresence } from 'framer-motion'
import { X, Database } from 'lucide-react'
import { useClusterStore } from '@/store/clusterStore'
import { RecoveryPanel } from './RecoveryPanel'

export function MetadataDrawer() {
  const open = useClusterStore(state => state.drawerOpen && state.drawerType === 'metadata')
  const selected = useClusterStore(state => state.selectedNodeId)
  const session = useClusterStore(state => state.drawerSession)
  const setOpen = useClusterStore(state => state.setDrawerOpen)
  const setType = useClusterStore(state => state.setDrawerType)
  const select = useClusterStore(state => state.setSelectedNodeId)
  const close = () => { setOpen(false); setType(null); select(null) }
  return <AnimatePresence>{open && selected && <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40" onClick={close}/>
    <motion.div role="dialog" aria-label={`Metadata ${selected}`} initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed right-0 top-0 h-full w-[400px] max-w-full max-w-full bg-card border-l border-border z-50 overflow-y-auto">
      <div className="p-4 border-b border-border flex items-center justify-between"><div className="flex items-center gap-2"><Database size={16} className="text-amber-400"/><span className="text-sm font-semibold">{selected}</span><span className="text-[10px] text-amber-400">METADATA</span></div><button aria-label="Close metadata details" onClick={close}><X size={16}/></button></div>
      <div className="p-4 space-y-4"><p className="text-[11px] text-muted-foreground">An original metadata Raft member. Recovery preserves its identity and persistent volume.</p><RecoveryPanel key={`${selected}-${session}`} nodeId={selected}/></div>
    </motion.div>
  </>}</AnimatePresence>
}
