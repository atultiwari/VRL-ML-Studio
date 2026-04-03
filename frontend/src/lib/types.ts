// ── Port types ────────────────────────────────────────────────────────────────

export type PortType = 'DataFrame' | 'SplitData' | 'Model' | 'Metrics' | 'Plot'

export interface PortSpec {
  id: string
  type: PortType
  label: string
}

// ── Port colours (matches design spec) ────────────────────────────────────────

export const PORT_COLORS: Record<PortType, string> = {
  DataFrame: '#3b82f6',  // blue
  SplitData: '#f59e0b',  // amber
  Model:     '#10b981',  // emerald
  Metrics:   '#a855f7',  // purple
  Plot:      '#f43f5e',  // rose
}

// ── Parameter spec (mirrors backend ParameterSpec) ───────────────────────────

export type ParamType =
  | 'int' | 'float' | 'str' | 'bool'
  | 'select' | 'multiselect'
  | 'int_or_null' | 'float_or_null'
  | 'column_select' | 'multicolumn_select'

export type ParamTier = 'basic' | 'advanced' | 'hidden'

export interface ParameterSpec {
  id: string
  label: string
  type: ParamType
  default: unknown
  min?: number | null
  max?: number | null
  options?: string[] | null
  tier: ParamTier
}

// ── Node manifest (mirrors backend NodeEntry response) ────────────────────────

export interface NodeManifestWithUI {
  id: string
  name: string
  version: string
  category: string
  description: string
  inputs: PortSpec[]
  outputs: PortSpec[]
  parameters: ParameterSpec[]
  icon: string
  color: string
  badge_text: string
  is_builtin: boolean
}

// ── Node status ───────────────────────────────────────────────────────────────

export type NodeStatus = 'idle' | 'running' | 'success' | 'error'

// ── Category metadata ─────────────────────────────────────────────────────────

export interface CategoryMeta {
  label: string
  /** Category id prefixes that belong to this group */
  prefixes: string[]
  colorClass: string
}

export const CATEGORY_GROUPS: CategoryMeta[] = [
  { label: 'Data Input',    prefixes: ['data.input'],                colorClass: 'text-blue-400'    },
  { label: 'Exploration',   prefixes: ['data.eda'],                  colorClass: 'text-purple-400'  },
  { label: 'Preprocessing', prefixes: ['preprocessing'],             colorClass: 'text-amber-400'   },
  { label: 'Classification',prefixes: ['model.classification'],      colorClass: 'text-emerald-400' },
  { label: 'Regression',    prefixes: ['model.regression'],          colorClass: 'text-cyan-400'    },
  { label: 'Unsupervised',  prefixes: ['model.unsupervised'],        colorClass: 'text-rose-400'    },
  { label: 'Evaluation',    prefixes: [
      'evaluation.classification',
      'evaluation.regression',
      'evaluation.clustering',
    ],                                                                colorClass: 'text-orange-400'  },
]

// ── Pipeline JSON (serialisation format) ──────────────────────────────────────

export interface PipelineNodeJSON {
  id: string
  type: string
  label: string
  position: { x: number; y: number }
  parameters: Record<string, unknown>
}

export interface PipelineEdgeJSON {
  id: string
  source: string
  target: string
  sourcePort: string
  targetPort: string
}

export interface PipelineJSON {
  version: '1.0'
  nodes: PipelineNodeJSON[]
  edges: PipelineEdgeJSON[]
}
