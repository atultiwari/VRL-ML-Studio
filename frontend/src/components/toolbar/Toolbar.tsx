import { Activity, GitBranch, Play, Save, Upload, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/store/pipelineStore'

interface ToolbarProps {
  backendStatus: 'connecting' | 'online' | 'offline'
  nodesLoaded?: number
}

export function Toolbar({ backendStatus, nodesLoaded }: ToolbarProps) {
  const undo    = usePipelineStore(s => s.undo)
  const redo    = usePipelineStore(s => s.redo)
  const canUndo = usePipelineStore(s => s.past.length > 0)
  const canRedo = usePipelineStore(s => s.future.length > 0)

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
      {/* ── Left: Logo ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold tracking-tight text-foreground">
            VRL ML Studio
          </span>
        </div>

        <span className="hidden h-4 w-px bg-border sm:block" />

        <Badge variant="outline" className="hidden sm:inline-flex font-mono text-[10px]">
          v1.0.0
        </Badge>
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

        <Button variant="ghost" size="sm" disabled className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save</span>
        </Button>

        <Button variant="ghost" size="sm" disabled className="gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>

        <Button variant="ghost" size="sm" disabled className="gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">History</span>
        </Button>

        <span className="mx-1 h-4 w-px bg-border" />

        <Button variant="default" size="sm" disabled className="gap-1.5">
          <Play className="h-3.5 w-3.5 fill-current" />
          Run
        </Button>
      </div>

      {/* ── Right: Status ── */}
      <div className="flex items-center gap-3">
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
