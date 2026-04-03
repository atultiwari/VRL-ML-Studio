import type { ParameterSpec } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface Props {
  spec: ParameterSpec
  value: string
  onChange: (v: string) => void
}

export function SelectControl({ spec, value, onChange }: Props) {
  const options = spec.options ?? []

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground">{spec.label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'h-8 w-full appearance-none rounded-md border border-border px-2.5 pr-7 text-xs',
            'bg-muted text-foreground outline-none',
            'transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30',
            'cursor-pointer'
          )}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}
