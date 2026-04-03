import type { ParameterSpec } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  spec: ParameterSpec
  value: string | string[] | null
  onChange: (v: string | string[] | null) => void
  /** Upstream DataFrame column names — populated in Stage 5 */
  columns?: string[]
}

export function ColumnSelectControl({ spec, value, onChange, columns = [] }: Props) {
  const isMulti = spec.type === 'multicolumn_select'
  const strVal = Array.isArray(value) ? value.join(', ') : (value ?? '')

  // Placeholder: show a text input until Stage 5 wires up upstream column info
  if (columns.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-foreground">{spec.label}</label>
        <input
          type="text"
          value={strVal}
          placeholder={isMulti ? 'col1, col2, …' : 'column name'}
          onChange={e => {
            const raw = e.target.value
            if (isMulti) {
              onChange(raw.split(',').map(s => s.trim()).filter(Boolean))
            } else {
              onChange(raw || null)
            }
          }}
          className={cn(
            'h-8 rounded-md border border-border px-2.5 text-xs',
            'bg-muted text-foreground outline-none placeholder:text-muted-foreground/60',
            'transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30'
          )}
        />
        <span className="text-[10px] text-muted-foreground/60">
          Column picker available after data is loaded
        </span>
      </div>
    )
  }

  // Full select (used in Stage 5+)
  const selected = Array.isArray(value) ? new Set(value) : new Set(value ? [value] : [])

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground">{spec.label}</label>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-muted px-2.5 py-2 max-h-36 overflow-y-auto">
        {columns.map(col => (
          <label key={col} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type={isMulti ? 'checkbox' : 'radio'}
              name={spec.id}
              checked={selected.has(col)}
              onChange={() => {
                if (isMulti) {
                  const next = selected.has(col)
                    ? [...selected].filter(c => c !== col)
                    : [...selected, col]
                  onChange(next)
                } else {
                  onChange(col)
                }
              }}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span className="text-xs text-foreground">{col}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
