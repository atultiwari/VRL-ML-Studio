import { useEffect } from 'react'
import { GitCommit, Loader2, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore, type CommitInfo } from '@/store/projectStore'
import type { PipelineJSON } from '@/lib/types'

interface Props {
  onRestore: (pipeline: PipelineJSON) => void
}

export function HistoryPanel({ onRestore }: Props) {
  const history = useProjectStore(s => s.history)
  const loading = useProjectStore(s => s.loadingHistory)
  const fetchHistory = useProjectStore(s => s.fetchHistory)
  const checkoutCommit = useProjectStore(s => s.checkoutCommit)
  const setHistoryOpen = useProjectStore(s => s.setHistoryOpen)

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleRestore = async (commit: CommitInfo) => {
    if (!confirm(`Restore pipeline from "${commit.message}"?\n\nCurrent changes will be auto-saved first.`)) {
      return
    }
    const pipeline = await checkoutCommit(commit.hash)
    onRestore(pipeline)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold text-foreground">Commit History</span>
        <button
          onClick={() => setHistoryOpen(false)}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {loading && history.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && history.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">No commits yet</p>
        )}

        <div className="flex flex-col">
          {history.map((commit, i) => (
            <div
              key={commit.hash}
              className={cn(
                'group relative flex gap-3 px-3 py-3',
                'hover:bg-muted/50 transition-colors',
                i < history.length - 1 && 'border-b border-border/50'
              )}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center pt-0.5">
                <div className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  i === 0 ? 'bg-primary/20' : 'bg-muted'
                )}>
                  <GitCommit className={cn(
                    'h-3 w-3',
                    i === 0 ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground leading-snug">
                  {commit.message}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {commit.hash.slice(0, 7)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(commit.timestamp)}
                  </span>
                </div>
              </div>

              {/* Restore button */}
              {i > 0 && (
                <button
                  onClick={() => handleRestore(commit)}
                  className={cn(
                    'shrink-0 self-center rounded p-1.5',
                    'text-muted-foreground opacity-0 group-hover:opacity-100',
                    'hover:bg-primary/15 hover:text-primary transition-all'
                  )}
                  title="Restore this version"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
