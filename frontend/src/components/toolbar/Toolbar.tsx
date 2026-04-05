import { useCallback, useState } from 'react'
import { Activity, Download, FolderOpen, GitBranch, Loader2, Play, Save, Shield, Upload, User, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/store/pipelineStore'
import { useExecutionStore } from '@/store/executionStore'
import { useProjectStore } from '@/store/projectStore'

interface ToolbarProps {
  backendStatus: 'connecting' | 'online' | 'offline'
  nodesLoaded?: number
  selectedNodeCount?: number
  workspaceName?: string
  onRun?: () => void
  onRunSelected?: () => void
  onSave?: () => void
  onExport?: () => void
  onImportWorkflow?: () => void
  onToggleHistory?: () => void
  onAdmin?: () => void
  adminEnabled?: boolean
  onGoHome?: () => void
}

export function Toolbar({ backendStatus, nodesLoaded, selectedNodeCount = 0, workspaceName, onRun, onRunSelected, onSave, onExport, onImportWorkflow, onToggleHistory, onAdmin, adminEnabled: showAdmin, onGoHome }: ToolbarProps) {
  const undo       = usePipelineStore(s => s.undo)
  const redo       = usePipelineStore(s => s.redo)
  const canUndo    = usePipelineStore(s => s.past.length > 0)
  const canRedo    = usePipelineStore(s => s.future.length > 0)
  const nodeCount  = usePipelineStore(s => s.nodes.length)
  const isRunning  = useExecutionStore(s => s.running)
  const project    = useProjectStore(s => s.currentProject)
  const historyOpen = useProjectStore(s => s.historyOpen)
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave()
    } finally {
      setSaving(false)
    }
  }, [onSave])

  const statusVariant =
    backendStatus === 'online'
      ? 'success'
      : backendStatus === 'connecting'
        ? 'warning'
        : 'error'

  const statusLabel =
    backendStatus === 'online'
      ? 'Connected'
      : backendStatus === 'connecting'
        ? 'Connecting…'
        : 'Offline'

  return (
    <header
      className={cn(
        'flex h-[var(--topbar-height)] items-center justify-between',
        'border-b border-border bg-card px-4',
        'shrink-0'
      )}
    >
      {/* ── Left: Logo + project name ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 rounded-md p-1 hover:bg-muted transition-colors"
          title="Projects"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold tracking-tight text-foreground">
            VRL ML Studio
          </span>
        </button>

        {project && (
          <>
            <span className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{project.name}</span>
              <Badge variant="outline" className="font-mono text-[9px]">
                {project.branch}
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* ── Centre: Pipeline actions ── */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={!canUndo}
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!canRedo}
          onClick={redo}
          title="Redo (Ctrl+Y)"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
          </svg>
        </Button>

        <span className="mx-1 h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          disabled={!project || saving}
          onClick={handleSave}
          className="gap-1.5"
        >
          {saving
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Save className="h-3.5 w-3.5" />
          }
          <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
        </Button>

        <Button
          variant={historyOpen ? 'secondary' : 'ghost'}
          size="sm"
          disabled={!project}
          onClick={onToggleHistory}
          className="gap-1.5"
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">History</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={nodeCount === 0}
          onClick={onExport}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onImportWorkflow}
          className="gap-1.5"
          title="Import a .vrlflow workflow file"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Import</span>
        </Button>

        <span className="mx-1 h-4 w-px bg-border" />

        <Button
          variant="default"
          size="sm"
          disabled={isRunning || nodeCount === 0 || backendStatus !== 'online'}
          onClick={selectedNodeCount > 0 ? onRunSelected : onRun}
          className="gap-1.5"
        >
          {isRunning
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Play className="h-3.5 w-3.5 fill-current" />
          }
          {isRunning
            ? 'Running…'
            : selectedNodeCount > 0
              ? `Run Selected (${selectedNodeCount})`
              : 'Run'
          }
        </Button>
      </div>

      {/* ── Right: Workspace + Status ── */}
      <div className="flex items-center gap-3">
        {showAdmin && onAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAdmin}
            title="Super Admin"
          >
            <Shield className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        {workspaceName && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="font-mono text-[10px]">
              {workspaceName}
            </Badge>
          </div>
        )}
        {nodesLoaded !== undefined && backendStatus === 'online' && (
          <span className="hidden text-xs text-muted-foreground sm:block">
            {nodesLoaded} node{nodesLoaded !== 1 ? 's' : ''}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
      </div>
    </header>
  )
}
