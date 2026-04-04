import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  FlaskConical,
  LayoutGrid,
  Loader2,
  PackagePlus,
  Search,
  Sliders,
  TrendingUp,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_GROUPS } from '@/lib/types'
import type { NodeManifestWithUI } from '@/lib/types'
import { NodeLibraryItem } from './NodeLibraryItem'
import { importNodePackage } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'

// Icon mapping for each category group label
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Data Input':     <Database    className="h-3.5 w-3.5" />,
  'Exploration':    <Search      className="h-3.5 w-3.5" />,
  'Preprocessing':  <Sliders     className="h-3.5 w-3.5" />,
  'Classification': <TrendingUp  className="h-3.5 w-3.5" />,
  'Regression':     <TrendingUp  className="h-3.5 w-3.5" />,
  'Unsupervised':   <LayoutGrid  className="h-3.5 w-3.5" />,
  'Evaluation':     <FlaskConical className="h-3.5 w-3.5" />,
}

interface SidebarProps {
  manifests: NodeManifestWithUI[]
  loading: boolean
  error: string | null
  onRefresh?: () => void
}

export function Sidebar({ manifests, loading, error, onRefresh }: SidebarProps) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sidebarOpen = useUIStore(s => s.sidebarOpen)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportError(null)

    try {
      await importNodePackage(file)
      onRefresh?.()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [onRefresh])

  const toggle = (label: string) =>
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }))

  // Group manifests by category group
  const grouped = useMemo(() => {
    const lq = query.toLowerCase()
    return CATEGORY_GROUPS.map(group => {
      const nodes = manifests.filter(
        m =>
          group.prefixes.some(p => m.category === p || m.category.startsWith(p)) &&
          (!lq || m.name.toLowerCase().includes(lq) || m.description.toLowerCase().includes(lq))
      )
      return { ...group, nodes }
    })
  }, [manifests, query])

  // Search result flat list
  const searchResults = useMemo(() => {
    if (!query) return null
    const lq = query.toLowerCase()
    return manifests.filter(
      m => m.name.toLowerCase().includes(lq) || m.description.toLowerCase().includes(lq)
    )
  }, [manifests, query])

  // Collapsed sidebar: show only category icons
  if (!sidebarOpen) {
    return (
      <aside className="flex w-10 shrink-0 flex-col border-r border-border bg-card">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center border-b border-border py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Expand node library"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-2">
          {CATEGORY_GROUPS.map(group => (
            <button
              key={group.label}
              onClick={toggleSidebar}
              className={cn(
                'flex items-center justify-center rounded-md p-1.5 transition-colors',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                group.colorClass
              )}
              title={group.label}
            >
              {CATEGORY_ICONS[group.label]}
            </button>
          ))}
        </nav>
      </aside>
    )
  }

  return (
    <aside
      className={cn(
        'flex w-[var(--sidebar-width)] shrink-0 flex-col',
        'border-r border-border bg-card'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Node Library
        </span>
        <div className="flex items-center gap-1.5">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Import .vrlnode package"
          >
            {importing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <PackagePlus className="h-3.5 w-3.5" />
            }
          </button>
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Collapse node library"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".vrlnode,.zip"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Import error toast */}
      {importError && (
        <div className="mx-3 mt-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-[10px] text-destructive">
          {importError}
          <button onClick={() => setImportError(null)} className="ml-1.5 font-bold">x</button>
        </div>
      )}

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <label className="flex h-8 items-center gap-2 rounded-md bg-muted px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes… (/)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
        </label>
      </div>

      {/* Content */}
      <nav className="flex-1 overflow-y-auto py-2">
        {error ? (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
            <WifiOff className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              Could not load nodes.<br />Is the backend running?
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-1 px-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-md bg-muted/50"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        ) : searchResults !== null ? (
          /* Flat search results */
          <ul className="space-y-0.5 px-2">
            {searchResults.length === 0 ? (
              <li className="px-2 py-4 text-center text-xs text-muted-foreground">
                No nodes match "{query}"
              </li>
            ) : (
              searchResults.map(m => (
                <li key={m.id}>
                  <NodeLibraryItem manifest={m} />
                </li>
              ))
            )}
          </ul>
        ) : (
          /* Categorised view */
          <ul className="space-y-0.5 px-2">
            {grouped.map(group => (
              <li key={group.label}>
                {/* Category header */}
                <button
                  onClick={() => toggle(group.label)}
                  disabled={group.nodes.length === 0}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2.5 py-2',
                    'text-xs transition-colors',
                    group.nodes.length > 0
                      ? 'cursor-pointer text-foreground hover:bg-muted/50'
                      : 'cursor-default text-muted-foreground/60'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={group.colorClass}>
                      {CATEGORY_ICONS[group.label]}
                    </span>
                    <span className="font-medium">{group.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {group.nodes.length}
                    </span>
                    {group.nodes.length > 0 && (
                      collapsed[group.label]
                        ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        : <ChevronDown  className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Node list */}
                {!collapsed[group.label] && group.nodes.length > 0 && (
                  <ul className="mt-0.5 space-y-0.5 pl-1">
                    {group.nodes.map(m => (
                      <li key={m.id}>
                        <NodeLibraryItem manifest={m} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* Footer hint */}
      <div className="border-t border-border px-3 py-2.5">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Drag nodes onto the canvas to build your pipeline.
          Connect output → input ports of the same type.
        </p>
      </div>
    </aside>
  )
}
