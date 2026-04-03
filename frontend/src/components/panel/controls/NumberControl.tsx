import type { ParameterSpec } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  spec: ParameterSpec
  value: number
  onChange: (v: number) => void
  error?: string
}

export function NumberControl({ spec, value, onChange, error }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground">{spec.label}</label>
      <input
        type="number"
        value={value}
        min={spec.min ?? undefined}
        max={spec.max ?? undefined}
        step={spec.type === 'float' ? 'any' : 1}
        onChange={e => {
          const n = spec.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10)
          if (!isNaN(n)) onChange(n)
        }}
        className={cn(
          'h-8 rounded-md border px-2.5 text-xs',
          'bg-muted text-foreground outline-none',
          'transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30',
          error ? 'border-destructive' : 'border-border'
        )}
      />
      {spec.min != null && spec.max != null && (
        <span className="text-[10px] text-muted-foreground">
          Range: {spec.min} – {spec.max}
        </span>
      )}
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  )
}
