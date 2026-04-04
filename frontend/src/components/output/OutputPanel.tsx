import { useCallback, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BarChart2, Table, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExecutionStore, type NodeOutput } from '@/store/executionStore'
import { usePipelineStore } from '@/store/pipelineStore'
import { DataFrameTable } from './DataFrameTable'
import { PlotViewer } from './PlotViewer'

export function OutputPanel() {
  const nodeId       = useExecutionStore(s => s.outputPanelNodeId)
  const portId       = useExecutionStore(s => s.outputPanelPortId)
  const nodeOutputs  = useExecutionStore(s => s.nodeOutputs)
  const nodeErrors   = useExecutionStore(s => s.nodeErrors)
  const nodeStatuses = useExecutionStore(s => s.nodeStatuses)
  const close        = useExecutionStore(s => s.closeOutputPanel)
  const openPanel    = useExecutionStore(s => s.openOutputPanel)

  const nodes        = usePipelineStore(s => s.nodes)

  const node         = useMemo(() => nodes.find(n => n.id === nodeId), [nodes, nodeId])
  const portOutputs  = nodeId ? nodeOutputs[nodeId] : undefined
  const nodeError    = nodeId ? nodeErrors[nodeId] : undefined
  const nodeStatus   = nodeId ? nodeStatuses[nodeId] : undefined

  // Pick active port output
  const activePortId = portId ?? (portOutputs ? Object.keys(portOutputs)[0] : undefined)
  const output: NodeOutput | undefined = activePortId ? portOutputs?.[activePortId] : undefined

  // ── Resize logic ──────────────────────────────────────────────────────────
  const [panelHeight, setPanelHeight] = useState(256) // 16rem default
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    startY.current = e.clientY
    startHeight.current = panelHeight
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [panelHeight])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const delta = startY.current - e.clientY
    const newHeight = Math.max(120, Math.min(startHeight.current + delta, window.innerHeight * 0.7))
    setPanelHeight(newHeight)
  }, [])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Show panel if there are outputs OR if the node has an error
  if (!nodeId || (!portOutputs && !nodeError)) return null

  const portIds = portOutputs ? Object.keys(portOutputs) : []

  return (
    <div
      className={cn(
        'flex flex-col',
        'border-t',
        nodeStatus === 'error' ? 'border-red-500/40' : 'border-border',
        'bg-card'
      )}
      style={{ height: panelHeight }}
    >
      {/* Resize handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="h-1.5 shrink-0 cursor-row-resize bg-transparent hover:bg-primary/20 active:bg-primary/30 transition-colors touch-none"
      />
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 border-b px-3 py-1.5',
        nodeStatus === 'error' ? 'border-red-500/20 bg-red-500/5' : 'border-border'
      )}>
        {nodeStatus === 'error' && (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
        )}
        <span className={cn(
          'text-xs font-medium',
          nodeStatus === 'error' ? 'text-red-400' : 'text-foreground'
        )}>
          {node?.data.label ?? nodeId}
          {nodeStatus === 'error' && ' — Error'}
        </span>

        {/* Port tabs (only when there are outputs) */}
        {portIds.length > 0 && (
          <div className="flex gap-1 ml-2">
            {portIds.map(pid => {
              const out = portOutputs?.[pid]
              return (
                <button
                  key={pid}
                  onClick={() => openPanel(nodeId, pid)}
                  className={cn(
                    'flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors',
                    activePortId === pid
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {out?.type === 'plot' ? <BarChart2 className="h-3 w-3" /> : <Table className="h-3 w-3" />}
                  {pid}
                </button>
              )
            })}
          </div>
        )}

        <button
          onClick={close}
          className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {nodeError && (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-red-400/70 mb-1">Execution Error</p>
              <p className="text-xs text-red-300 font-mono whitespace-pre-wrap break-words leading-relaxed">{nodeError}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Check the node&apos;s input connections and parameters, then re-run the pipeline.
            </p>
          </div>
        )}

        {!nodeError && !output && (
          <p className="m-auto text-xs text-muted-foreground">No output</p>
        )}

        {output?.type === 'dataframe' && (
          <DataFrameTable output={output} />
        )}

        {output?.type === 'plot' && (
          <PlotViewer output={output} />
        )}

        {output?.type === 'metrics' && (
          <div className="flex flex-wrap gap-3 p-3 overflow-y-auto">
            {Object.entries(output.data).map(([k, v]) => {
              const quality = getMetricQuality(k, v)
              return (
                <div
                  key={k}
                  className={cn(
                    'flex flex-col rounded-lg border px-3 py-2 min-w-[110px]',
                    quality === 'good'    && 'border-emerald-500/30 bg-emerald-500/10',
                    quality === 'fair'    && 'border-amber-500/30 bg-amber-500/10',
                    quality === 'poor'    && 'border-red-500/30 bg-red-500/10',
                    quality === 'neutral' && 'border-border bg-muted/30',
                  )}
                >
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</span>
                  <span className={cn(
                    'mt-0.5 text-sm font-semibold',
                    quality === 'good'    && 'text-emerald-400',
                    quality === 'fair'    && 'text-amber-400',
                    quality === 'poor'    && 'text-red-400',
                    quality === 'neutral' && 'text-foreground',
                  )}>
                    {typeof v === 'number' ? v.toFixed(4) : String(v)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {output?.type === 'split_data' && (
          <SplitDataViewer output={output} />
        )}

        {output?.type === 'opaque' && (
          <p className="m-auto text-xs text-muted-foreground">
            {output.repr} (not previewable)
          </p>
        )}
      </div>
    </div>
  )
}

// ── Metric quality classification ────────────────────────────────────────────

type MetricQuality = 'good' | 'fair' | 'poor' | 'neutral'

/** Classify a metric value as good/fair/poor based on common ML metric ranges. */
function getMetricQuality(key: string, value: unknown): MetricQuality {
  if (typeof value !== 'number') return 'neutral'
  const k = key.toLowerCase()

  // Higher-is-better metrics (0–1 scale): accuracy, precision, recall, f1, auc, r2
  const higherBetter = ['accuracy', 'precision', 'recall', 'f1', 'auc', 'r2', 'r_squared', 'adj_r2']
  if (higherBetter.some(m => k.includes(m))) {
    if (value >= 0.8) return 'good'
    if (value >= 0.6) return 'fair'
    return 'poor'
  }

  // Lower-is-better error metrics: mae, mse, rmse, log_loss
  const lowerBetter = ['mae', 'mse', 'rmse', 'error', 'loss']
  if (lowerBetter.some(m => k.includes(m))) {
    // These are scale-dependent, so just show neutral unless extremely large
    return 'neutral'
  }

  // Silhouette score (-1 to 1, higher is better)
  if (k.includes('silhouette')) {
    if (value >= 0.5) return 'good'
    if (value >= 0.25) return 'fair'
    return 'poor'
  }

  return 'neutral'
}

// ── SplitData viewer (train/test tabs) ──────────────────────────────────────

function SplitDataViewer({ output }: { output: import('@/store/executionStore').SplitDataOutput }) {
  const [tab, setTab] = useState<'train' | 'test'>('train')
  const df = tab === 'train' ? output.train : output.test

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-border px-3 py-1">
        {(['train', 'test'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
              tab === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'train' ? 'Train' : 'Test'} ({df.shape[0]} × {df.shape[1]})
          </button>
        ))}
        {output.target_col && (
          <span className="ml-2 text-[10px] text-muted-foreground">
            target: <span className="font-medium text-foreground">{output.target_col}</span>
          </span>
        )}
      </div>
      <DataFrameTable output={df} />
    </div>
  )
}
