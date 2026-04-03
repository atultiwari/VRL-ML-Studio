import { useCallback, useEffect, useState } from 'react'
import { Canvas } from '@/components/canvas/Canvas'
import { ParamPanel } from '@/components/panel/ParamPanel'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { checkHealth } from '@/lib/api'
import { useNodeRegistry } from '@/hooks/useNodeRegistry'
import { usePipelineStore } from '@/store/pipelineStore'
import { useUIStore } from '@/store/uiStore'

type BackendStatus = 'connecting' | 'online' | 'offline'

export function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('connecting')
  const [nodesLoaded, setNodesLoaded] = useState<number | undefined>()

  const { manifests, loading, error } = useNodeRegistry()
  const selectedNodeId = useUIStore(s => s.selectedNodeId)

  // Keyboard shortcuts for undo/redo
  const undo = usePipelineStore(s => s.undo)
  const redo = usePipelineStore(s => s.redo)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    },
    [undo, redo]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Backend health polling
  useEffect(() => {
    let cancelled = false

    const ping = async () => {
      try {
        const data = await checkHealth()
        if (!cancelled) {
          setBackendStatus('online')
          setNodesLoaded(data.nodes_loaded)
        }
      } catch {
        if (!cancelled) setBackendStatus('offline')
      }
    }

    ping()
    const interval = setInterval(ping, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <Toolbar backendStatus={backendStatus} nodesLoaded={nodesLoaded} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar manifests={manifests} loading={loading} error={error} />
        <Canvas manifests={manifests} />
        {selectedNodeId && <ParamPanel />}
      </div>
    </div>
  )
}
