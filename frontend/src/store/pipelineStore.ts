import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as rfAddEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from 'reactflow'
import type { NodeManifestWithUI, NodeStatus } from '@/lib/types'
import { PORT_COLORS as portColors } from '@/lib/types'

// ── Node data payload ─────────────────────────────────────────────────────────

export interface VrlNodeData {
  manifest: NodeManifestWithUI
  parameters: Record<string, unknown>
  status: NodeStatus
  label: string
}

export type VrlNode = Node<VrlNodeData>

// ── History snapshot ──────────────────────────────────────────────────────────

interface Snapshot {
  nodes: VrlNode[]
  edges: Edge[]
}

const MAX_HISTORY = 50

// ── Store shape ───────────────────────────────────────────────────────────────

interface PipelineStore {
  nodes: VrlNode[]
  edges: Edge[]
  past: Snapshot[]
  future: Snapshot[]

  // React Flow change handlers
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void

  // Explicit node/edge mutations
  addNode: (manifest: NodeManifestWithUI, position: { x: number; y: number }) => void
  updateNodeLabel: (id: string, label: string) => void
  updateNodeParams: (id: string, params: Record<string, unknown>) => void
  updateNodeStatus: (id: string, status: NodeStatus) => void

  // History API
  pushSnapshot: () => void
  undo: () => void
  redo: () => void

  // Misc
  clearPipeline: () => void
}

// ── Store implementation ──────────────────────────────────────────────────────

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      past: [],
      future: [],

      pushSnapshot: () => {
        const { nodes, edges, past } = get()
        const snapshot: Snapshot = {
          nodes: nodes.map(n => ({ ...n, data: { ...n.data } })),
          edges: [...edges],
        }
        set({ past: [...past.slice(-MAX_HISTORY + 1), snapshot], future: [] })
      },

      onNodesChange: (changes) => {
        const hasRemove = changes.some(c => c.type === 'remove')
        if (hasRemove) get().pushSnapshot()
        set(s => ({ nodes: applyNodeChanges(changes, s.nodes) as VrlNode[] }))
      },

      onEdgesChange: (changes) => {
        const hasRemove = changes.some(c => c.type === 'remove')
        if (hasRemove) get().pushSnapshot()
        set(s => ({ edges: applyEdgeChanges(changes, s.edges) }))
      },

      onConnect: (connection) => {
        get().pushSnapshot()
        // Colour edge by source port type
        const sourceNode = get().nodes.find(n => n.id === connection.source)
        const sourcePort = sourceNode?.data.manifest.outputs.find(
          p => p.id === connection.sourceHandle
        )
        const edgeColor = sourcePort ? portColors[sourcePort.type] : portColors.DataFrame

        set(s => ({
          edges: rfAddEdge(
            {
              ...connection,
              style: { stroke: edgeColor, strokeWidth: 1.5 },
              data: { portType: sourcePort?.type ?? 'DataFrame' },
            },
            s.edges
          ),
        }))
      },

      addNode: (manifest, position) => {
        get().pushSnapshot()
        const id = `${manifest.id}-${Date.now()}`
        const node: VrlNode = {
          id,
          type: 'vrlNode',
          position,
          data: {
            manifest,
            parameters: {},
            status: 'idle',
            label: manifest.name,
          },
        }
        set(s => ({ nodes: [...s.nodes, node] }))
      },

      updateNodeLabel: (id, label) => {
        set(s => ({
          nodes: s.nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, label } } : n)),
        }))
      },

      updateNodeParams: (id, params) => {
        set(s => ({
          nodes: s.nodes.map(n =>
            n.id === id ? { ...n, data: { ...n.data, parameters: params } } : n
          ),
        }))
      },

      updateNodeStatus: (id, status) => {
        set(s => ({
          nodes: s.nodes.map(n =>
            n.id === id ? { ...n, data: { ...n.data, status } } : n
          ),
        }))
      },

      undo: () => {
        const { past } = get()
        if (past.length === 0) return
        const prev = past[past.length - 1]
        set(s => ({
          past: s.past.slice(0, -1),
          future: [{ nodes: [...s.nodes], edges: [...s.edges] }, ...s.future].slice(0, MAX_HISTORY),
          nodes: prev.nodes,
          edges: prev.edges,
        }))
      },

      redo: () => {
        const { future } = get()
        if (future.length === 0) return
        const next = future[0]
        set(s => ({
          past: [...s.past, { nodes: [...s.nodes], edges: [...s.edges] }].slice(-MAX_HISTORY),
          future: s.future.slice(1),
          nodes: next.nodes,
          edges: next.edges,
        }))
      },

      clearPipeline: () => {
        get().pushSnapshot()
        set({ nodes: [], edges: [] })
      },
    }),
    {
      name: 'vrl-pipeline-v1',
      // Only persist canvas state, not undo/redo history
      partialize: s => ({ nodes: s.nodes, edges: s.edges }),
    }
  )
)
