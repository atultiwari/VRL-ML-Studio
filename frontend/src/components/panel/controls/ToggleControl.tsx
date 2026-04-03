import type { ParameterSpec } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  spec: ParameterSpec
  value: boolean
  onChange: (v: boolean) => void
}

export function ToggleControl({ spec, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-foreground">{spec.label}</label>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary/60',
          value ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
            value ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  )
}
