import { useCallback, useState } from 'react'
import { Check, Copy, Link, Loader2, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { createShareLink } from '@/lib/api'
import type { PipelineJSON } from '@/lib/types'

interface ShareDialogProps {
  open: boolean
  onClose: () => void
  pipeline: PipelineJSON
  pipelineName: string
}

export function ShareDialog({ open, onClose, pipeline, pipelineName }: ShareDialogProps) {
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateLink = useCallback(async () => {
    setSharing(true)
    setError(null)
    try {
      const { token } = await createShareLink(pipeline, pipelineName)
      const url = `${window.location.origin}${window.location.pathname}#/shared/${token}`
      setShareUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link')
    } finally {
      setSharing(false)
    }
  }, [pipeline, pipelineName])

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [shareUrl])

  const handleClose = useCallback(() => {
    setShareUrl(null)
    setCopied(false)
    setError(null)
    onClose()
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Share Workflow</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {!shareUrl ? (
          <div className="space-y-4 mb-6">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Link className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Create a shareable link
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Anyone with the link can open this workflow in their browser.
                    The link contains a snapshot of the current pipeline — future
                    changes won't affect it.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Sharing:</span>{' '}
                {pipelineName}
                <span className="ml-2 text-muted-foreground">
                  ({pipeline.nodes.length} node{pipeline.nodes.length !== 1 ? 's' : ''})
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">
                Share link created successfully
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Share URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className={cn(
                    'flex-1 rounded-md border border-border bg-muted/50 px-3 py-2',
                    'text-xs font-mono text-foreground',
                    'focus:outline-none focus:ring-1 focus:ring-primary/50',
                  )}
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  variant={copied ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5 shrink-0"
                >
                  {copied
                    ? <><Check className="h-3.5 w-3.5" /> Copied</>
                    : <><Copy className="h-3.5 w-3.5" /> Copy</>
                  }
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This is a point-in-time snapshot. Changes you make after sharing
              won't update the shared link.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            {shareUrl ? 'Done' : 'Cancel'}
          </Button>
          {!shareUrl && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateLink}
              disabled={sharing || pipeline.nodes.length === 0}
              className="gap-1.5"
            >
              {sharing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Share2 className="h-3.5 w-3.5" />
              }
              {sharing ? 'Creating...' : 'Create Link'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
