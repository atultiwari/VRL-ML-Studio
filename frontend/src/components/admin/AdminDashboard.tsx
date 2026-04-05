import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Download,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  Square,
  SquareCheckBig,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  adminBulkDelete,
  adminBulkDownload,
  adminDeleteProject,
  adminDownloadProject,
  adminListProjects,
  adminLogout,
  type AdminProject,
} from '@/lib/api'

interface AdminDashboardProps {
  onBack: () => void
}

type SortField = 'name' | 'display_name' | 'last_modified' | 'node_count'
type SortDir = 'asc' | 'desc'

function formatDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
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

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('last_modified')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminListProjects()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // ── Selection helpers ───────────────────────────────────────────────────

  const projectKey = (p: AdminProject) => `${p.tenant_id}/${p.project_name}`

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let list = projects.filter(p =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.display_name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    )
    list = [...list].sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [projects, search, sortField, sortDir])

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(projectKey(p)))

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(projectKey)))
    }
  }, [allSelected, filtered])

  const toggleSelect = useCallback((p: AdminProject) => {
    setSelected(prev => {
      const next = new Set(prev)
      const key = projectKey(p)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return prev
      }
      setSortDir('desc')
      return field
    })
  }, [])

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleDownloadSingle = useCallback(async (p: AdminProject) => {
    setActionLoading(true)
    try {
      const blob = await adminDownloadProject(p.tenant_id, p.project_name)
      downloadBlob(blob, `${p.project_name}.vrlflow`)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setActionLoading(false)
    }
  }, [])

  const handleBulkDownload = useCallback(async () => {
    if (selected.size === 0) return
    setActionLoading(true)
    try {
      const refs = [...selected].map(key => {
        const [tenant_id, project_name] = key.split('/')
        return { tenant_id, project_name }
      })
      const blob = await adminBulkDownload(refs)
      downloadBlob(blob, `vrl-projects-${new Date().toISOString().slice(0, 10)}.zip`)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Bulk download failed')
    } finally {
      setActionLoading(false)
    }
  }, [selected])

  const handleDeleteSingle = useCallback(async (p: AdminProject) => {
    const ok = window.confirm(
      `Permanently delete "${p.name}" (workspace: ${p.display_name})?\n\nThis cannot be undone.`,
    )
    if (!ok) return
    setActionLoading(true)
    try {
      await adminDeleteProject(p.tenant_id, p.project_name)
      setProjects(prev => prev.filter(x => projectKey(x) !== projectKey(p)))
      setSelected(prev => { const next = new Set(prev); next.delete(projectKey(p)); return next })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setActionLoading(false)
    }
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (selected.size === 0) return
    const ok = window.confirm(
      `Permanently delete ${selected.size} project(s)?\n\nThis cannot be undone.`,
    )
    if (!ok) return
    setActionLoading(true)
    try {
      const refs = [...selected].map(key => {
        const [tenant_id, project_name] = key.split('/')
        return { tenant_id, project_name }
      })
      const result = await adminBulkDelete(refs)
      const deletedSet = new Set(result.deleted)
      setProjects(prev => prev.filter(x => !deletedSet.has(projectKey(x))))
      setSelected(new Set())
      if (result.errors.length > 0) {
        window.alert(`Some deletes failed:\n${result.errors.map(e => `${e.project}: ${e.error}`).join('\n')}`)
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Bulk delete failed')
    } finally {
      setActionLoading(false)
    }
  }, [selected])

  const handleLogout = useCallback(async () => {
    await adminLogout()
    onBack()
  }, [onBack])

  // ── Render ──────────────────────────────────────────────────────────────

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null
    return <span className="ml-1 text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-md p-1 hover:bg-muted transition-colors" title="Back to Studio">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Super Admin</span>
          </div>
          <Badge variant="info">{projects.length} projects</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchProjects} disabled={loading} title="Refresh">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border bg-card/50 px-4 py-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects, workspaces, tags..."
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="info">{selected.size} selected</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDownload}
              disabled={actionLoading}
              className="gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            {search ? 'No projects match your search.' : 'No projects found across any workspace.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border text-left">
              <tr>
                <th className="w-10 px-4 py-2">
                  <button onClick={toggleSelectAll} className="p-0.5">
                    {allSelected
                      ? <SquareCheckBig className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4 text-muted-foreground" />
                    }
                  </button>
                </th>
                <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSort('name')}>
                  Project{sortIndicator('name')}
                </th>
                <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSort('display_name')}>
                  Workspace{sortIndicator('display_name')}
                </th>
                <th className="px-3 py-2 cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort('node_count')}>
                  Nodes{sortIndicator('node_count')}
                </th>
                <th className="px-3 py-2 cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort('last_modified')}>
                  Modified{sortIndicator('last_modified')}
                </th>
                <th className="px-3 py-2 hidden xl:table-cell">Tags</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const key = projectKey(p)
                const isSelected = selected.has(key)
                return (
                  <tr
                    key={key}
                    className={cn(
                      'border-b border-border/50 transition-colors',
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/30',
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <button onClick={() => toggleSelect(p)} className="p-0.5">
                        {isSelected
                          ? <SquareCheckBig className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4 text-muted-foreground" />
                        }
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground">{p.name}</div>
                      {p.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="font-mono text-[10px]">{p.display_name}</Badge>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground">
                      {p.node_count}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground">
                      {formatDate(p.last_modified)}
                    </td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {p.tags.slice(0, 3).map(t => (
                          <Badge key={t} variant="default" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadSingle(p)}
                          disabled={actionLoading}
                          title="Download .vrlflow"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSingle(p)}
                          disabled={actionLoading}
                          title="Delete project"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
