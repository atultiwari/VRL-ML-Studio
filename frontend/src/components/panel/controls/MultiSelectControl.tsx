import type { ParameterSpec } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  spec: ParameterSpec
  value: string[]
  onChange: (v: string[]) => void
}

export function MultiSelectControl({ spec, value, onChange }: Props) {
  const options = spec.options ?? []
  const selected = new Set(value)

  const toggle = (opt: string) => {
    const next = selected.has(opt)
      ? value.filter(v => v !== opt)
      : [...value, opt]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground">{spec.label}</label>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-muted px-2.5 py-2">
        {options.length === 0 ? (
          <span className="text-xs text-muted-foreground">No options</span>
        ) : (
          options.map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
                className="h-3.5 w-3.5 rounded accent-primary"
              />
              <span className={cn('text-xs', selected.has(opt) ? 'text-foreground' : 'text-muted-foreground')}>
                {opt}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  )
}
