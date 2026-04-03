import type { ParameterSpec } from '@/lib/types'
import { NumberControl } from './controls/NumberControl'
import { NullableNumberControl } from './controls/NullableNumberControl'
import { ToggleControl } from './controls/ToggleControl'
import { SelectControl } from './controls/SelectControl'
import { MultiSelectControl } from './controls/MultiSelectControl'
import { ColumnSelectControl } from './controls/ColumnSelectControl'

interface Props {
  spec: ParameterSpec
  value: unknown
  onChange: (v: unknown) => void
  error?: string
  columns?: string[]
}

/** Routes a parameter to the correct control based on its type. */
export function ParamControl({ spec, value, onChange, error, columns }: Props) {
  switch (spec.type) {
    case 'int':
    case 'float':
      return (
        <NumberControl
          spec={spec}
          value={value as number}
          onChange={onChange}
          error={error}
        />
      )

    case 'int_or_null':
    case 'float_or_null':
      return (
        <NullableNumberControl
          spec={spec}
          value={value as number | null}
          onChange={onChange}
        />
      )

    case 'bool':
      return (
        <ToggleControl
          spec={spec}
          value={!!value}
          onChange={onChange}
        />
      )

    case 'select':
      return (
        <SelectControl
          spec={spec}
          value={(value as string) ?? spec.options?.[0] ?? ''}
          onChange={onChange}
        />
      )

    case 'multiselect':
      return (
        <MultiSelectControl
          spec={spec}
          value={(value as string[]) ?? []}
          onChange={onChange}
        />
      )

    case 'column_select':
    case 'multicolumn_select':
      return (
        <ColumnSelectControl
          spec={spec}
          value={value as string | string[] | null}
          onChange={onChange}
          columns={columns}
        />
      )

    case 'str':
    default:
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-foreground">{spec.label}</label>
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            className="h-8 rounded-md border border-border bg-muted px-2.5 text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>
      )
  }
}
