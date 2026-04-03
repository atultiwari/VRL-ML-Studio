import { create } from 'zustand'
import type { NodeStatus } from '@/lib/types'

// ── Serialised output types (mirrors backend output_serializer.py) ─────────────

export interface DataFrameOutput {
  type: 'dataframe'
  columns: { name: string; dtype: string }[]
  data: unknown[][]
  shape: [number, number]
}

export interface PlotOutput {
  type: 'plot'
  spec: Record<string, unknown>  // Plotly JSON spec
}

export interface MetricsOutput {
  type: 'metrics'
  data: Record<string, unknown>
}

export interface OpaqueOutput {
  type: 'opaque'
  repr: string
}

export type NodeOutput = DataFrameOutput | PlotOutput | MetricsOutput | OpaqueOutput

// Map from portId → output
export type PortOutputMap = Record<string, NodeOutput>

// ── Store shape ────────────────────────────────────────────────────────────────

interface ExecutionStore {
  running: boolean
  nodeStatuses: Record<string, NodeStatus>
  nodeOutputs: Record<string, PortOutputMap>
  outputPanelNodeId: string | null   // which node's output to show
  outputPanelPortId: string | null   // which port's output to show

  // Setters called by WebSocket handler
  setRunning: (v: boolean) => void
  setNodeStatus: (nodeId: string, status: NodeStatus) => void
  setNodeOutputs: (nodeId: string, outputs: PortOutputMap) => void
  clearExecution: () => void

  // Output panel
  openOutputPanel: (nodeId: string, portId?: string) => void
  closeOutputPanel: () => void
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  running: false,
  nodeStatuses: {},
  nodeOutputs: {},
  outputPanelNodeId: null,
  outputPanelPortId: null,

  setRunning: (running) => set({ running }),

  setNodeStatus: (nodeId, status) =>
    set(s => ({ nodeStatuses: { ...s.nodeStatuses, [nodeId]: status } })),

  setNodeOutputs: (nodeId, outputs) =>
    set(s => ({ nodeOutputs: { ...s.nodeOutputs, [nodeId]: outputs } })),

  clearExecution: () =>
    set({ running: false, nodeStatuses: {}, nodeOutputs: {} }),

  openOutputPanel: (nodeId, portId) =>
    set({ outputPanelNodeId: nodeId, outputPanelPortId: portId ?? null }),

  closeOutputPanel: () =>
    set({ outputPanelNodeId: null, outputPanelPortId: null }),
}))
