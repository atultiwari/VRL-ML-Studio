import { useCallback, useState } from 'react'
import { Download, FileCode, FileJson, FileText, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { exportNotebook, exportPython } from '@/lib/api'
import type { PipelineJSON, WorkflowExportJSON } from '@/lib/types'

type ExportFormat = 'python' | 'notebook' | 'workflow'

const STUDIO_VERSION = '1.0.0'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  pipeline: PipelineJSON
  pipelineName: string
}

function buildWorkflowExport(pipeline: PipelineJSON, name: string): WorkflowExportJSON {
  const nodeTypes = [...new Set(pipeline.nodes.map(n => n.type))]
  return {
    format: 'vrl-ml-studio-workflow',
    format_version: '1.0',
    studio_version: STUDIO_VERSION,
    exported_at: new Date().toISOString(),
    name,
    description: '',
    node_types_used: nodeTypes,
    pipeline,
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ExportDialog({ open, onClose, pipeline, pipelineName }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('workflow')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = useCallback(async () => {
    setExporting(true)
    setError(null)

    try {
      const safeName = pipelineName.replace(/\s+/g, '_').toLowerCase()

      if (format === 'workflow') {
        const envelope = buildWorkflowExport(pipeline, pipelineName)
        const json = JSON.stringify(envelope, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        downloadBlob(blob, `${safeName}.vrlflow`)
      } else {
        const blob = format === 'python'
          ? await exportPython(pipeline, pipelineName)
          : await exportNotebook(pipeline, pipelineName)
        const ext = format === 'python' ? '.py' : '.ipynb'
        downloadBlob(blob, safeName + ext)
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }, [format, pipeline, pipelineName, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Export Pipeline</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Format selection */}
        <div className="space-y-3 mb-6">
          <p className="text-sm text-muted-foreground">Choose export format:</p>

          <button
            onClick={() => setFormat('workflow')}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors',
              format === 'workflow'
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <FileJson className={cn('h-8 w-8', format === 'workflow' ? 'text-primary' : 'text-muted-foreground')} />
            <div>
              <div className="font-medium text-foreground">Workflow</div>
              <div className="text-xs text-muted-foreground">
                .vrlflow file — share and import into any VRL ML Studio instance
              </div>
            </div>
          </button>

          <button
            onClick={() => setFormat('python')}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors',
              format === 'python'
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <FileCode className={cn('h-8 w-8', format === 'python' ? 'text-primary' : 'text-muted-foreground')} />
            <div>
              <div className="font-medium text-foreground">Python Script</div>
              <div className="text-xs text-muted-foreground">
                Standalone .py file — runnable with <code className="text-[10px] bg-muted px-1 rounded">python script.py</code>
              </div>
            </div>
          </button>

          <button
            onClick={() => setFormat('notebook')}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors',
              format === 'notebook'
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <FileText className={cn('h-8 w-8', format === 'notebook' ? 'text-primary' : 'text-muted-foreground')} />
            <div>
              <div className="font-medium text-foreground">Jupyter Notebook</div>
              <div className="text-xs text-muted-foreground">
                .ipynb file — open in Jupyter or Google Colab
              </div>
            </div>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            disabled={exporting || pipeline.nodes.length === 0}
            className="gap-1.5"
          >
            {exporting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Download className="h-3.5 w-3.5" />
            }
            {exporting ? 'Exporting...' : 'Download'}
          </Button>
        </div>
      </div>
    </div>
  )
}
