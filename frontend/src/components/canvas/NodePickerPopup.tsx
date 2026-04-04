import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_GROUPS } from '@/lib/types'
import type { NodeManifestWithUI, PortType } from '@/lib/types'

interface NodePickerPopupProps {
  /** Screen-space position for the popup */
  x: number
  y: number
  /** All available node manifests */
  manifests: NodeManifestWithUI[]
  /** If set, only show nodes with a compatible input port of this type */
  filterPortType?: PortType | null
  /** Called when user picks a node */
  onSelect: (manifest: NodeManifestWithUI) => void
  /** Called when the popup should close */
  onClose: () => void
}

export function NodePickerPopup({
  x,
  y,
  manifests,
  filterPortType,
  onSelect,
  onClose,
}: NodePickerPopupProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  // Auto-focus the search input on mount
  useEffect(() => {
    // Small delay to avoid event bleed from right-click
    const t = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [])

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Filter manifests by port compatibility and search query
  const compatibleManifests = useMemo(() => {
    if (!filterPortType) return manifests
    return manifests.filter(m =>
      m.inputs.some(port => port.type === filterPortType)
    )
  }, [manifests, filterPortType])

  const filtered = useMemo(() => {
    const lq = query.toLowerCase()
    if (!lq) return compatibleManifests
    return compatibleManifests.filter(
      m =>
        m.name.toLowerCase().includes(lq) ||
        m.category.toLowerCase().includes(lq) ||
        m.description.toLowerCase().includes(lq)
    )
  }, [compatibleManifests, query])

  // Group filtered results by category
  const grouped = useMemo(() => {
    return CATEGORY_GROUPS.map(group => ({
      ...group,
      nodes: filtered.filter(m =>
        group.prefixes.some(p => m.category === p || m.category.startsWith(p))
      ),
    })).filter(g => g.nodes.length > 0)
  }, [filtered])

  // Flat list for keyboard navigation
  const flatList = useMemo(
    () => grouped.flatMap(g => g.nodes),
    [grouped]
  )

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [flatList.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, flatList.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && flatList[activeIndex]) {
        e.preventDefault()
        onSelect(flatList[activeIndex])
      }
    },
    [flatList, activeIndex, onSelect]
  )

  // Scroll active item into view
  useEffect(() => {
    const el = containerRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Clamp position so popup stays within viewport
  const popupWidth = 280
  const popupMaxHeight = 400
  const clampedX = Math.min(x, window.innerWidth - popupWidth - 16)
  const clampedY = Math.min(y, window.innerHeight - popupMaxHeight - 16)

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-[200] flex flex-col rounded-lg border border-border bg-card shadow-2xl',
        'animate-in fade-in-0 zoom-in-95',
      )}
      style={{
        left: Math.max(8, clampedX),
        top: Math.max(8, clampedY),
        width: popupWidth,
        maxHeight: popupMaxHeight,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Search input */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={
            filterPortType
              ? `Filter ${filterPortType} compatible nodes...`
              : 'Type to filter nodes...'
          }
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      {/* Port type hint */}
      {filterPortType && (
        <div className="border-b border-border px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground">
            Showing nodes with <span className="font-semibold text-foreground">{filterPortType}</span> input port
          </span>
        </div>
      )}

      {/* Node list */}
      <div className="flex-1 overflow-y-auto py-1">
        {grouped.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {filterPortType
              ? `No compatible nodes for ${filterPortType}`
              : `No nodes match "${query}"`}
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.label}>
              {/* Category header */}
              <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-3 py-1">
                <span className={cn('text-[10px] font-semibold uppercase tracking-wider', group.colorClass)}>
                  {group.label}
                </span>
              </div>

              {/* Nodes */}
              {group.nodes.map(m => {
                const idx = flatList.indexOf(m)
                const isActive = idx === activeIndex
                return (
                  <button
                    key={m.id}
                    data-active={isActive}
                    onClick={() => onSelect(m)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                      isActive
                        ? 'bg-primary/10 text-foreground'
                        : 'text-foreground/80 hover:bg-muted/50'
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    {m.badge_text && (
                      <span
                        className="shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase leading-none text-white"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.badge_text}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer shortcut hint */}
      <div className="border-t border-border px-3 py-1.5">
        <span className="text-[9px] text-muted-foreground">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[8px]">↑↓</kbd> navigate
          {' '}<kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[8px]">↵</kbd> select
          {' '}<kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[8px]">esc</kbd> close
        </span>
      </div>
    </div>
  )
}
