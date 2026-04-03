import { useCallback, useEffect, useState } from 'react'
import { Canvas } from '@/components/canvas/Canvas'
import { OutputPanel } from '@/components/output/OutputPanel'
import { ParamPanel } from '@/components/panel/ParamPanel'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { ExportDialog } from '@/components/toolbar/ExportDialog'
import { HistoryPanel } from '@/components/history/HistoryPanel'
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard'
import { checkHealth } from '@/lib/api'
import { useNodeRegistry } from '@/hooks/useNodeRegistry'
import { useWebSocket } from '@/hooks/useWebSocket'
import { usePipelineStore } from '@/store/pipelineStore'
import { useUIStore } from '@/store/uiStore'
import { useExecutionStore } from '@/store/executionStore'
import { useProjectStore } from '@/store/projectStore'
import type { PipelineJSON } from '@/lib/types'

type BackendStatus = 'connecting' | 'online' | 'offline'
type View = 'dashboard' | 'canvas'


export function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('connecting')
  const [nodesLoaded, setNodesLoaded] = useState<number | undefined>()
  const [view, setView] = useState<View>('dashboard')
  const [exportOpen, setExportOpen] = useState(false)

  const { manifests, loading, error, refresh: refreshNodes } = useNodeRegistry()
  const { executePipeline }           = useWebSocket()
  const selectedNodeId                = useUIStore(s => s.selectedNodeId)
  const outputNodeId                  = useExecutionStore(s => s.outputPanelNodeId)
  const historyOpen                   = useProjectStore(s => s.historyOpen)
  const setHistoryOpen                = useProjectStore(s => s.setHistoryOpen)
  const currentProject                = useProjectStore(s => s.currentProject)
  const saveProject                   = useProjectStore(s => s.saveProject)
  const closeProject                  = useProjectStore(s => s.closeProject)

  // Keyboard shortcuts for undo/redo
  const undo             = usePipelineStore(s => s.undo)
  const redo             = usePipelineStore(s => s.redo)
  const toPipelineJSON   = usePipelineStore(s => s.toPipelineJSON)
  const loadPipelineFromJSON = usePipelineStore(s => s.loadPipelineFromJSON)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (view !== 'canvas') return
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
      if (e.key === 's') { e.preventDefault(); handleSave() }
    },
    [undo, redo, view] // eslint-disable-line react-hooks/exhaustive-deps
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
        if (!cancelled) { setBackendStatus('online'); setNodesLoaded(data.nodes_loaded) }
      } catch {
        if (!cancelled) setBackendStatus('offline')
      }
    }
    ping()
    const interval = setInterval(ping, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const handleRun = useCallback(() => {
    executePipeline(toPipelineJSON())
  }, [executePipeline, toPipelineJSON])

  const handleSave = useCallback(async () => {
    if (!currentProject) return
    await saveProject(toPipelineJSON())
  }, [currentProject, saveProject, toPipelineJSON])

  const handleExport = useCallback(() => {
    setExportOpen(true)
  }, [])

  const handleToggleHistory = useCallback(() => {
    setHistoryOpen(!historyOpen)
  }, [historyOpen, setHistoryOpen])

  // Open a project → load pipeline onto canvas
  const handleOpenProject = useCallback((pipeline: PipelineJSON) => {
    loadPipelineFromJSON(pipeline, manifests)
    setView('canvas')
  }, [loadPipelineFromJSON, manifests])

  // Restore from history → reload pipeline
  const handleRestore = useCallback((pipeline: PipelineJSON) => {
    loadPipelineFromJSON(pipeline, manifests)
  }, [loadPipelineFromJSON, manifests])

  // Go back to dashboard
  const handleGoHome = useCallback(() => {
    closeProject()
    usePipelineStore.getState().clearPipeline()
    setView('dashboard')
  }, [closeProject])

  // ── Dashboard view ──
  if (view === 'dashboard') {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
        <Toolbar
          backendStatus={backendStatus}
          nodesLoaded={nodesLoaded}
          onGoHome={handleGoHome}
        />
        <ProjectDashboard onOpenProject={handleOpenProject} />
      </div>
    )
  }

  // ── Canvas view ──
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <Toolbar
        backendStatus={backendStatus}
        nodesLoaded={nodesLoaded}
        onRun={handleRun}
        onSave={handleSave}
        onExport={handleExport}
        onToggleHistory={handleToggleHistory}
        onGoHome={handleGoHome}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar manifests={manifests} loading={loading} error={error} onRefresh={refreshNodes} />
          <Canvas manifests={manifests} />
          {selectedNodeId && <ParamPanel />}
          {historyOpen && <HistoryPanel onRestore={handleRestore} />}
        </div>

        {outputNodeId && <OutputPanel />}
      </div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        pipeline={toPipelineJSON()}
        pipelineName={currentProject?.name ?? 'Untitled Pipeline'}
      />
    </div>
  )
}
