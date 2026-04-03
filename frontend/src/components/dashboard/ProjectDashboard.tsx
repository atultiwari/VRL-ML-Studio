import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, Plus, Clock, Tag, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore, type ProjectSummary } from '@/store/projectStore'
import { NewProjectDialog } from './NewProjectDialog'
import type { PipelineJSON } from '@/lib/types'

interface Props {
  onOpenProject: (pipeline: PipelineJSON) => void
  onOpenWizard: () => void
}

export function ProjectDashboard({ onOpenProject, onOpenWizard }: Props) {
  const projects = useProjectStore(s => s.projectList)
  const loading = useProjectStore(s => s.loadingProjects)
  const fetchProjects = useProjectStore(s => s.fetchProjects)
  const openProject = useProjectStore(s => s.openProject)

  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleOpen = useCallback(async (path: string) => {
    const pipeline = await openProject(path)
    onOpenProject(pipeline)
  }, [openProject, onOpenProject])

  const handleCreated = useCallback((pipeline: PipelineJSON) => {
    setShowNew(false)
    onOpenProject(pipeline)
  }, [onOpenProject])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60_000) return 'Just now'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto bg-background">
      <div className="flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                VRL ML Studio
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Build ML pipelines visually. No code required.
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2.5',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>

        {/* Project list */}
        {loading && projects.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        )}

        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No projects yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your first project to get started
              </p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create Project
            </button>
          </div>
        )}

        {projects.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Recent Projects
            </h2>
            {projects.map(p => (
              <ProjectCard
                key={p.path}
                project={p}
                onOpen={() => handleOpen(p.path)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewProjectDialog
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
          onOpenWizard={() => { setShowNew(false); onOpenWizard() }}
        />
      )}
    </div>
  )
}

function ProjectCard({
  project,
  onOpen,
  formatDate,
}: {
  project: ProjectSummary
  onOpen: () => void
  formatDate: (iso: string) => string
}) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        'flex items-center gap-4 rounded-lg border border-border bg-card p-4',
        'text-left transition-all hover:border-primary/40 hover:bg-card/80',
        'group'
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <FolderOpen className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
        {project.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.description}</p>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(project.last_modified)}
          </span>
          {project.tags.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Tag className="h-3 w-3" />
              {project.tags.join(', ')}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
