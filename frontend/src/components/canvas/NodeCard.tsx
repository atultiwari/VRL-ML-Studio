import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Play, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PORT_COLORS } from '@/lib/types'
import type { VrlNodeData } from '@/store/pipelineStore'
import { usePipelineStore } from '@/store/pipelineStore'
import { useUIStore } from '@/store/uiStore'

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  idle:    'bg-[hsl(var(--status-idle))]',
  running: 'bg-[hsl(var(--status-running))] animate-pulse',
  success: 'bg-[hsl(var(--status-success))]',
  error:   'bg-[hsl(var(--status-error))]',
} as const

// ── NodeCard ──────────────────────────────────────────────────────────────────

function NodeCardInner({ id, data, selected }: NodeProps<VrlNodeData>) {
  const { manifest, status, label } = data
  const updateNodeLabel = usePipelineStore(s => s.updateNodeLabel)
  const onRunToHere = useUIStore(s => s.runToHereHandler)
  const renamingNodeId = useUIStore(s => s.renamingNodeId)
  const setRenamingNodeId = useUIStore(s => s.setRenamingNodeId)

  const isRenaming = renamingNodeId === id
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming) {
      setDraft(label)
      // Small delay to let the input render before focusing
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [isRenaming, label])

  const commitLabel = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== label) updateNodeLabel(id, trimmed)
    else setDraft(label)
    setRenamingNodeId(null)
  }

  const handleRunClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onRunToHere?.(id)
  }, [id, onRunToHere])

  const isRunning = status === 'running'

  return (
    <div
      className={cn(
        'group/node relative flex min-w-[160px] flex-col rounded-lg border',
        'bg-[hsl(var(--node-bg))] shadow-md transition-all duration-150',
        status === 'error'
          ? 'border-red-500/50 ring-1 ring-red-500/20'
          : selected
            ? 'border-primary ring-1 ring-primary/40'
            : 'border-[hsl(var(--node-border))] hover:border-[hsl(var(--node-border-hover))]'
      )}
    >
      {/* Colour accent bar */}
      <div
        className="h-0.5 w-full rounded-t-lg"
        style={{ backgroundColor: manifest.color }}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col">
          {isRenaming ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={e => {
                if (e.key === 'Enter') commitLabel()
                if (e.key === 'Escape') { setDraft(label); setRenamingNodeId(null) }
              }}
              className="w-full rounded bg-transparent text-xs font-medium text-foreground outline-none ring-1 ring-primary/60 px-1"
            />
          ) : (
            <span
              className="truncate text-xs font-medium text-foreground cursor-default"
              title="Right-click to rename"
            >
              {label}
            </span>
          )}
          <span className="truncate text-[10px] text-muted-foreground">{manifest.category}</span>
          {status === 'error' && (
            <span className="text-[9px] text-red-400 mt-0.5">double-click to view error</span>
          )}
        </div>

        {/* Play button + Badge + status dot */}
        <div className="flex shrink-0 items-center gap-1.5">
          {onRunToHere && (
            <button
              onClick={handleRunClick}
              disabled={isRunning}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded',
                'transition-all duration-150',
                isRunning
                  ? 'bg-primary/20 text-primary cursor-wait'
                  : 'bg-transparent text-muted-foreground opacity-0 group-hover/node:opacity-100 hover:bg-primary/20 hover:text-primary'
              )}
              title="Run to here"
            >
              {isRunning
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Play className="h-3 w-3 fill-current" />
              }
            </button>
          )}
          {manifest.badge_text && (
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-white"
              style={{ backgroundColor: manifest.color }}
            >
              {manifest.badge_text}
            </span>
          )}
          <span
            className={cn('h-2 w-2 rounded-full', STATUS_STYLES[status])}
            title={status}
          />
        </div>
      </div>

      {/* Ports */}
      {manifest.inputs.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-[hsl(var(--node-border))] px-3 py-1.5">
          {manifest.inputs.map(port => (
            <div key={port.id} className="relative flex items-center gap-2">
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                className="!-left-[17px]"
                style={{ borderColor: PORT_COLORS[port.type], backgroundColor: PORT_COLORS[port.type] + '33' }}
              />
              <span className="text-[10px] text-muted-foreground">{port.label}</span>
              <span
                className="ml-auto rounded-sm px-1 py-px text-[8px] font-medium"
                style={{ color: PORT_COLORS[port.type], backgroundColor: PORT_COLORS[port.type] + '22' }}
              >
                {port.type}
              </span>
            </div>
          ))}
        </div>
      )}

      {manifest.outputs.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-[hsl(var(--node-border))] px-3 py-1.5">
          {manifest.outputs.map(port => (
            <div key={port.id} className="relative flex items-center gap-2">
              <span
                className="rounded-sm px-1 py-px text-[8px] font-medium"
                style={{ color: PORT_COLORS[port.type], backgroundColor: PORT_COLORS[port.type] + '22' }}
              >
                {port.type}
              </span>
              <span className="text-[10px] text-muted-foreground">{port.label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                className="!-right-[17px]"
                style={{ borderColor: PORT_COLORS[port.type], backgroundColor: PORT_COLORS[port.type] + '33' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const NodeCard = memo(NodeCardInner)
