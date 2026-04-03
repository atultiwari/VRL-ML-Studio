import { useMemo, useState } from 'react'
import { BarChart2, Table, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExecutionStore, type NodeOutput } from '@/store/executionStore'
import { usePipelineStore } from '@/store/pipelineStore'
import { DataFrameTable } from './DataFrameTable'
import { PlotViewer } from './PlotViewer'

export function OutputPanel() {
  const nodeId       = useExecutionStore(s => s.outputPanelNodeId)
  const portId       = useExecutionStore(s => s.outputPanelPortId)
  const nodeOutputs  = useExecutionStore(s => s.nodeOutputs)
  const close        = useExecutionStore(s => s.closeOutputPanel)
  const openPanel    = useExecutionStore(s => s.openOutputPanel)

  const nodes        = usePipelineStore(s => s.nodes)

  const node         = useMemo(() => nodes.find(n => n.id === nodeId), [nodes, nodeId])
  const portOutputs  = nodeId ? nodeOutputs[nodeId] : undefined

  // Pick active port output
  const activePortId = portId ?? (portOutputs ? Object.keys(portOutputs)[0] : undefined)
  const output: NodeOutput | undefined = activePortId ? portOutputs?.[activePortId] : undefined

  if (!nodeId || !portOutputs) return null

  const portIds = Object.keys(portOutputs)

  return (
    <div
      className={cn(
        'flex h-64 flex-col',
        'border-t border-border bg-card'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-foreground">
          {node?.data.label ?? nodeId}
        </span>

        {/* Port tabs */}
        <div className="flex gap-1 ml-2">
          {portIds.map(pid => {
            const out = portOutputs[pid]
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

        <button
          onClick={close}
          className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {!output && (
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
