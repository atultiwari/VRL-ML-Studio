import type { ParameterSpec } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  spec: ParameterSpec
  value: number | null
  onChange: (v: number | null) => void
}

export function NullableNumberControl({ spec, value, onChange }: Props) {
  const isNull = value === null

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground">{spec.label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          disabled={isNull}
          value={isNull ? '' : value}
          min={spec.min ?? undefined}
          max={spec.max ?? undefined}
          step={spec.type === 'float_or_null' ? 'any' : 1}
          onChange={e => {
            const n = spec.type === 'float_or_null'
              ? parseFloat(e.target.value)
              : parseInt(e.target.value, 10)
            if (!isNaN(n)) onChange(n)
          }}
          className={cn(
            'h-8 flex-1 rounded-md border border-border px-2.5 text-xs',
            'bg-muted text-foreground outline-none',
            'transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30',
            isNull && 'opacity-40'
          )}
          placeholder={isNull ? 'None' : ''}
        />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isNull}
            onChange={e => onChange(e.target.checked ? null : (spec.min ?? 1))}
            className="h-3.5 w-3.5 rounded accent-primary"
          />
          None
        </label>
      </div>
    </div>
  )
}
