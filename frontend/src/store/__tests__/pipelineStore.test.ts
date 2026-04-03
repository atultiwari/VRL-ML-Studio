import { describe, it, expect, beforeEach } from 'vitest'
import { usePipelineStore } from '../pipelineStore'
import type { NodeManifestWithUI } from '@/lib/types'

const mockManifest: NodeManifestWithUI = {
  id: 'vrl.core.csv_loader',
  name: 'CSV File Import',
  version: '1.0.0',
  category: 'data.input',
  description: 'Load a CSV file',
  inputs: [],
  outputs: [{ id: 'dataframe_out', type: 'DataFrame', label: 'Output' }],
  parameters: [
    { id: 'delimiter', label: 'Delimiter', type: 'str', default: ',', tier: 'basic' },
  ],
  icon: 'file-spreadsheet',
  color: '#3b82f6',
  badge_text: 'CSV',
  is_builtin: true,
}

const mockManifest2: NodeManifestWithUI = {
  ...mockManifest,
  id: 'vrl.core.data_profiler',
  name: 'Data Info',
  category: 'data.eda',
  inputs: [{ id: 'dataframe_in', type: 'DataFrame', label: 'Input' }],
  outputs: [
    { id: 'dataframe_out', type: 'DataFrame', label: 'Output' },
    { id: 'plot_out', type: 'Plot', label: 'Plot' },
  ],
  badge_text: 'DP',
}

function getStore() {
  return usePipelineStore.getState()
}

describe('pipelineStore', () => {
  beforeEach(() => {
    usePipelineStore.setState({
      nodes: [],
      edges: [],
      past: [],
      future: [],
    })
  })

  describe('addNode', () => {
    it('adds a node with correct data', () => {
      getStore().addNode(mockManifest, { x: 100, y: 200 })
      const { nodes } = getStore()
      expect(nodes).toHaveLength(1)
      expect(nodes[0].position).toEqual({ x: 100, y: 200 })
      expect(nodes[0].data.manifest.id).toBe('vrl.core.csv_loader')
      expect(nodes[0].data.label).toBe('CSV File Import')
      expect(nodes[0].data.status).toBe('idle')
      expect(nodes[0].data.parameters).toEqual({})
      expect(nodes[0].type).toBe('vrlNode')
    })

    it('pushes a snapshot to undo history', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      expect(getStore().past).toHaveLength(1)
    })

    it('generates ids containing the manifest id', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      const id = getStore().nodes[0].id
      expect(id).toContain('vrl.core.csv_loader')
    })
  })

  describe('updateNodeLabel', () => {
    it('updates the label of a specific node', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      const nodeId = getStore().nodes[0].id
      getStore().updateNodeLabel(nodeId, 'My CSV')
      expect(getStore().nodes[0].data.label).toBe('My CSV')
    })
  })

  describe('updateNodeParams', () => {
    it('sets parameters on a node', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      const nodeId = getStore().nodes[0].id
      getStore().updateNodeParams(nodeId, { delimiter: ';' })
      expect(getStore().nodes[0].data.parameters).toEqual({ delimiter: ';' })
    })
  })

  describe('updateNodeStatus', () => {
    it('sets status on a node', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      const nodeId = getStore().nodes[0].id
      getStore().updateNodeStatus(nodeId, 'running')
      expect(getStore().nodes[0].data.status).toBe('running')
    })
  })

  describe('undo / redo', () => {
    it('undo restores the previous state', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      expect(getStore().nodes).toHaveLength(1)

      getStore().undo()
      expect(getStore().nodes).toHaveLength(0)
    })

    it('redo restores the undone state', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      getStore().undo()
      expect(getStore().nodes).toHaveLength(0)

      getStore().redo()
      expect(getStore().nodes).toHaveLength(1)
    })

    it('undo does nothing when no history', () => {
      getStore().undo()
      expect(getStore().nodes).toHaveLength(0)
    })

    it('redo does nothing when no future', () => {
      getStore().redo()
      expect(getStore().nodes).toHaveLength(0)
    })

    it('multiple undo/redo round-trips', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      getStore().addNode(mockManifest2, { x: 200, y: 0 })
      expect(getStore().nodes).toHaveLength(2)

      getStore().undo()
      expect(getStore().nodes).toHaveLength(1)

      getStore().undo()
      expect(getStore().nodes).toHaveLength(0)

      getStore().redo()
      expect(getStore().nodes).toHaveLength(1)

      getStore().redo()
      expect(getStore().nodes).toHaveLength(2)
    })

    it('new action clears future stack', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      getStore().undo()
      expect(getStore().future).toHaveLength(1)

      // New action should clear future
      getStore().addNode(mockManifest2, { x: 100, y: 0 })
      expect(getStore().future).toHaveLength(0)
    })
  })

  describe('clearPipeline', () => {
    it('removes all nodes and edges, pushes snapshot', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      getStore().addNode(mockManifest2, { x: 200, y: 0 })
      expect(getStore().nodes).toHaveLength(2)

      getStore().clearPipeline()
      expect(getStore().nodes).toHaveLength(0)
      expect(getStore().edges).toHaveLength(0)
      // Can undo back to previous state
      expect(getStore().past.length).toBeGreaterThan(0)
    })
  })

  describe('toPipelineJSON', () => {
    it('serializes nodes to pipeline JSON format', () => {
      getStore().addNode(mockManifest, { x: 50, y: 100 })
      const json = getStore().toPipelineJSON()
      expect(json.version).toBe('1.0')
      expect(json.nodes).toHaveLength(1)
      expect(json.nodes[0].type).toBe('vrl.core.csv_loader')
      expect(json.nodes[0].position).toEqual({ x: 50, y: 100 })
      expect(json.nodes[0].label).toBe('CSV File Import')
    })

    it('serializes edges correctly', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      getStore().addNode(mockManifest2, { x: 200, y: 0 })
      const [n1, n2] = getStore().nodes

      getStore().onConnect({
        source: n1.id,
        target: n2.id,
        sourceHandle: 'dataframe_out',
        targetHandle: 'dataframe_in',
      })

      const json = getStore().toPipelineJSON()
      expect(json.edges).toHaveLength(1)
      expect(json.edges[0].source).toBe(n1.id)
      expect(json.edges[0].target).toBe(n2.id)
      expect(json.edges[0].sourcePort).toBe('dataframe_out')
      expect(json.edges[0].targetPort).toBe('dataframe_in')
    })
  })

  describe('loadPipelineFromJSON', () => {
    it('restores nodes and edges from JSON', () => {
      const manifests = [mockManifest, mockManifest2]
      const pipeline = {
        version: '1.0' as const,
        nodes: [
          { id: 'n1', type: 'vrl.core.csv_loader', label: 'My CSV', position: { x: 10, y: 20 }, parameters: { delimiter: ';' } },
          { id: 'n2', type: 'vrl.core.data_profiler', label: 'Profiler', position: { x: 200, y: 20 }, parameters: {} },
        ],
        edges: [
          { id: 'e1', source: 'n1', target: 'n2', sourcePort: 'dataframe_out', targetPort: 'dataframe_in' },
        ],
      }

      getStore().loadPipelineFromJSON(pipeline, manifests)

      const { nodes, edges } = getStore()
      expect(nodes).toHaveLength(2)
      expect(nodes[0].data.label).toBe('My CSV')
      expect(nodes[0].data.parameters).toEqual({ delimiter: ';' })
      expect(edges).toHaveLength(1)
      expect(edges[0].sourceHandle).toBe('dataframe_out')
    })

    it('skips nodes with unknown manifest types', () => {
      const pipeline = {
        version: '1.0' as const,
        nodes: [
          { id: 'n1', type: 'vrl.core.nonexistent', label: 'Ghost', position: { x: 0, y: 0 }, parameters: {} },
        ],
        edges: [],
      }

      getStore().loadPipelineFromJSON(pipeline, [mockManifest])
      expect(getStore().nodes).toHaveLength(0)
    })

    it('clears undo/redo history on load', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      expect(getStore().past.length).toBeGreaterThan(0)

      getStore().loadPipelineFromJSON({ version: '1.0', nodes: [], edges: [] }, [])
      expect(getStore().past).toHaveLength(0)
      expect(getStore().future).toHaveLength(0)
    })
  })

  describe('onConnect', () => {
    it('adds an edge and pushes snapshot', () => {
      getStore().addNode(mockManifest, { x: 0, y: 0 })
      getStore().addNode(mockManifest2, { x: 200, y: 0 })
      const [n1, n2] = getStore().nodes
      const pastBefore = getStore().past.length

      getStore().onConnect({
        source: n1.id,
        target: n2.id,
        sourceHandle: 'dataframe_out',
        targetHandle: 'dataframe_in',
      })

      expect(getStore().edges).toHaveLength(1)
      expect(getStore().past.length).toBeGreaterThan(pastBefore)
    })
  })
})
