import { useCallback, useEffect, useState } from 'react'
import { Canvas } from '@/components/canvas/Canvas'
import { OutputPanel } from '@/components/output/OutputPanel'
import { ParamPanel } from '@/components/panel/ParamPanel'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { ExportDialog } from '@/components/toolbar/ExportDialog'
import { KeyboardShortcutsPanel } from '@/components/ui/KeyboardShortcutsPanel'
import { OnboardingTour } from '@/components/ui/OnboardingTour'
import { HistoryPanel } from '@/components/history/HistoryPanel'
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard'
import { SmartWizard } from '@/components/wizard/SmartWizard'
import { checkHealth } from '@/lib/api'
import { useNodeRegistry } from '@/hooks/useNodeRegistry'
import { useWebSocket } from '@/hooks/useWebSocket'
import { usePipelineStore } from '@/store/pipelineStore'
import { useUIStore } from '@/store/uiStore'
import { useExecutionStore } from '@/store/executionStore'
import { useProjectStore } from '@/store/projectStore'
import { useWizardStore } from '@/store/wizardStore'
import type { PipelineJSON } from '@/lib/types'

type BackendStatus = 'connecting' | 'online' | 'offline'
type View = 'dashboard' | 'canvas' | 'wizard'


export function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('connecting')
  const [nodesLoaded, setNodesLoaded] = useState<number | undefined>()
  const [view, setView] = useState<View>('dashboard')
  const [exportOpen, setExportOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const { manifests, loading, error, refresh: refreshNodes } = useNodeRegistry()
  const { executePipeline }           = useWebSocket()
  const selectedNodeId                = useUIStore(s => s.selectedNodeId)
  const setRunToHereHandler           = useUIStore(s => s.setRunToHereHandler)
  const outputNodeId                  = useExecutionStore(s => s.outputPanelNodeId)
  const historyOpen                   = useProjectStore(s => s.historyOpen)
  const setHistoryOpen                = useProjectStore(s => s.setHistoryOpen)
  const currentProject                = useProjectStore(s => s.currentProject)
  const saveProject                   = useProjectStore(s => s.saveProject)
  const closeProject                  = useProjectStore(s => s.closeProject)
  const createProject                 = useProjectStore(s => s.createProject)

  // Track selected node count for "Run Selected" button
  const selectedNodeCount = usePipelineStore(s => s.nodes.filter(n => n.selected).length)

  // Keyboard shortcuts for undo/redo
  const undo             = usePipelineStore(s => s.undo)
  const redo             = usePipelineStore(s => s.redo)
  const toPipelineJSON   = usePipelineStore(s => s.toPipelineJSON)
  const loadPipelineFromJSON = usePipelineStore(s => s.loadPipelineFromJSON)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // ? key toggles shortcuts panel (any view, no modifier needed)
      if (e.key === '?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setShortcutsOpen(prev => !prev)
        return
      }
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

  // ── Execution modes ────────────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    executePipeline(toPipelineJSON())
  }, [executePipeline, toPipelineJSON])

  /** Run only selected nodes + their ancestors */
  const handleRunSelected = useCallback(() => {
    const { nodes } = usePipelineStore.getState()
    const selectedIds = nodes.filter(n => n.selected).map(n => n.id)
    if (selectedIds.length === 0) return
    executePipeline(toPipelineJSON(), selectedIds)
  }, [executePipeline, toPipelineJSON])

  /** Run a single node + its ancestors (triggered from per-node play button) */
  const handleRunToHere = useCallback((nodeId: string) => {
    executePipeline(toPipelineJSON(), [nodeId])
  }, [executePipeline, toPipelineJSON])

  // Register the run-to-here handler so NodeCard play buttons work
  useEffect(() => {
    setRunToHereHandler(handleRunToHere)
    return () => setRunToHereHandler(null)
  }, [handleRunToHere, setRunToHereHandler])

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
    useWizardStore.getState().reset()
    setView('dashboard')
  }, [closeProject])

  // Open Smart Wizard
  const handleOpenWizard = useCallback(() => {
    useWizardStore.getState().reset()
    setView('wizard')
  }, [])

  // Smart Wizard completed → create project, load pipeline, auto-execute
  const handleWizardComplete = useCallback(async (pipeline: PipelineJSON, projectName: string) => {
    try {
      // Create a project with blank template, then load the wizard pipeline
      await createProject(projectName, 'Created by Smart Wizard', 'wizard', 'blank')
      // Load the wizard-built pipeline onto canvas
      loadPipelineFromJSON(pipeline, manifests)
      setView('canvas')
      // Save the wizard pipeline to the project
      await saveProject(pipeline, 'Smart Wizard pipeline')
      // Auto-execute the pipeline
      setTimeout(() => {
        executePipeline(pipeline)
      }, 500)
    } catch {
      // If project creation fails (e.g. name conflict), still load onto canvas
      loadPipelineFromJSON(pipeline, manifests)
      setView('canvas')
      setTimeout(() => {
        executePipeline(pipeline)
      }, 500)
    }
  }, [createProject, loadPipelineFromJSON, manifests, saveProject, executePipeline])

  const handleWizardCancel = useCallback(() => {
    useWizardStore.getState().reset()
    setView('dashboard')
  }, [])

  // ── Wizard view ──
  if (view === 'wizard') {
    return (
      <SmartWizard
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
      />
    )
  }

  // ── Dashboard view ──
  if (view === 'dashboard') {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
        <Toolbar
          backendStatus={backendStatus}
          nodesLoaded={nodesLoaded}
          onGoHome={handleGoHome}
        />
        <ProjectDashboard onOpenProject={handleOpenProject} onOpenWizard={handleOpenWizard} />
      </div>
    )
  }

  // ── Canvas view ──
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <Toolbar
        backendStatus={backendStatus}
        nodesLoaded={nodesLoaded}
        selectedNodeCount={selectedNodeCount}
        onRun={handleRun}
        onRunSelected={handleRunSelected}
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

      <KeyboardShortcutsPanel
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <OnboardingTour />
    </div>
  )
}
