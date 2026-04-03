import { Database, FlaskConical, LayoutGrid, Search, Sliders, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategoryItem {
  icon: React.ReactNode
  label: string
  count: number
  color: string
}

const CATEGORIES: CategoryItem[] = [
  { icon: <Database className="h-3.5 w-3.5" />,     label: 'Data Input',       count: 4,  color: 'text-blue-400' },
  { icon: <Search className="h-3.5 w-3.5" />,       label: 'Exploration',      count: 5,  color: 'text-purple-400' },
  { icon: <Sliders className="h-3.5 w-3.5" />,      label: 'Preprocessing',    count: 9,  color: 'text-amber-400' },
  { icon: <TrendingUp className="h-3.5 w-3.5" />,   label: 'Classification',   count: 8,  color: 'text-emerald-400' },
  { icon: <TrendingUp className="h-3.5 w-3.5" />,   label: 'Regression',       count: 9,  color: 'text-cyan-400' },
  { icon: <LayoutGrid className="h-3.5 w-3.5" />,   label: 'Unsupervised',     count: 5,  color: 'text-rose-400' },
  { icon: <FlaskConical className="h-3.5 w-3.5" />, label: 'Evaluation',       count: 11, color: 'text-orange-400' },
]

export function Sidebar() {
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
      </div>

      {/* Search (Stage 2+) */}
      <div className="border-b border-border px-3 py-2">
        <div className="flex h-8 items-center gap-2 rounded-md bg-muted px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Search nodes… (/)</span>
        </div>
      </div>

      {/* Categories */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5 px-2">
          {CATEGORIES.map((cat) => (
            <li key={cat.label}>
              <button
                disabled
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2.5 py-2',
                  'text-sm text-muted-foreground',
                  'opacity-60 cursor-not-allowed',
                  'hover:bg-muted/50 transition-colors'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cat.color}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </div>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {cat.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer hint */}
      <div className="border-t border-border px-3 py-2.5">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Drag nodes onto the canvas to build your pipeline.
          <br />
          <span className="text-primary/70">Stage 2</span> — canvas coming soon.
        </p>
      </div>
    </aside>
  )
}
