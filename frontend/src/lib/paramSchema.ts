import { z } from 'zod'
import type { ParameterSpec } from './types'

/** Build a Zod schema dynamically from a node's parameter specs. */
export function buildParamSchema(
  params: ParameterSpec[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const p of params) {
    shape[p.id] = fieldSchema(p)
  }

  return z.object(shape)
}

function fieldSchema(p: ParameterSpec): z.ZodTypeAny {
  switch (p.type) {
    case 'int': {
      let f = z.number({ invalid_type_error: `${p.label} must be a number` }).int()
      if (p.min != null) f = f.min(p.min, `${p.label} must be ≥ ${p.min}`)
      if (p.max != null) f = f.max(p.max, `${p.label} must be ≤ ${p.max}`)
      return f
    }
    case 'float': {
      let f = z.number({ invalid_type_error: `${p.label} must be a number` })
      if (p.min != null) f = f.min(p.min)
      if (p.max != null) f = f.max(p.max)
      return f
    }
    case 'str':
      return z.string()
    case 'bool':
      return z.boolean()
    case 'select':
      return z.string()
    case 'multiselect':
      return z.array(z.string()).default([])
    case 'int_or_null': {
      let base = z.number().int()
      if (p.min != null) base = base.min(p.min)
      if (p.max != null) base = base.max(p.max)
      return base.nullable().default(null)
    }
    case 'float_or_null': {
      let base = z.number()
      if (p.min != null) base = base.min(p.min)
      if (p.max != null) base = base.max(p.max)
      return base.nullable().default(null)
    }
    case 'column_select':
      return z.string().nullable().default(null)
    case 'multicolumn_select':
      return z.array(z.string()).default([])
    default:
      return z.unknown()
  }
}

/** Extract default values from parameter specs. */
export function buildDefaultValues(
  params: ParameterSpec[]
): Record<string, unknown> {
  return Object.fromEntries(params.map(p => [p.id, p.default ?? null]))
}
