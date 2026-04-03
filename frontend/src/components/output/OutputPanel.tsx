import { useMemo } from 'react'
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
          <div className="flex flex-wrap gap-3 p-3">
            {Object.entries(output.data).map(([k, v]) => (
              <div key={k} className="flex flex-col rounded-lg border border-border bg-muted/30 px-3 py-2 min-w-[100px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</span>
                <span className="mt-0.5 text-sm font-medium text-foreground">
                  {typeof v === 'number' ? v.toFixed(4) : String(v)}
                </span>
              </div>
            ))}
          </div>
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
