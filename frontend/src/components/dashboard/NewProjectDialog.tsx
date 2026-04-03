import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/store/projectStore'
import type { PipelineJSON } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: (pipeline: PipelineJSON) => void
}

export function NewProjectDialog({ onClose, onCreated }: Props) {
  const templates = useProjectStore(s => s.templates)
  const fetchTemplates = useProjectStore(s => s.fetchTemplates)
  const createProject = useProjectStore(s => s.createProject)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [template, setTemplate] = useState('blank')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Project name is required')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const result = await createProject(name.trim(), description.trim(), tags.trim(), template)
      onCreated(result.pipeline)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }, [name, description, tags, template, createProject, onCreated])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">New Project</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Project Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My ML Project"
              autoFocus
              className="h-9 rounded-md border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              className="h-9 rounded-md border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Tags</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="classification, tutorial"
              className="h-9 rounded-md border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            <span className="text-[10px] text-muted-foreground">Comma-separated</span>
          </div>

          {/* Template */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Start from Template</label>
            <div className="flex flex-wrap gap-1.5">
              {[{ id: 'blank', name: 'Blank', node_count: 0 }, ...templates].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    template === t.id
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t.name}
                  {t.node_count > 0 && (
                    <span className="ml-1 text-[10px] opacity-60">({t.node_count})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className={cn(
              'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              creating && 'opacity-60'
            )}
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
