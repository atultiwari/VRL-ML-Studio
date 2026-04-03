import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  type Connection,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { NodeCard } from './NodeCard'
import { NodeContextMenu } from './NodeContextMenu'
import { usePipelineStore } from '@/store/pipelineStore'
import { useUIStore } from '@/store/uiStore'
import type { NodeManifestWithUI } from '@/lib/types'
import { cn } from '@/lib/utils'

// Custom node type registry — must be stable (defined outside component)
const NODE_TYPES = { vrlNode: NodeCard }

const DND_MIME = 'application/vrl-node-id'

interface CanvasProps {
  manifests: NodeManifestWithUI[]
}

interface ContextMenuState {
  x: number
  y: number
  nodeId: string
  nodeType: string
}

export function Canvas({ manifests }: CanvasProps) {
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const nodes         = usePipelineStore(s => s.nodes)
  const edges         = usePipelineStore(s => s.edges)
  const onNodesChange = usePipelineStore(s => s.onNodesChange)
  const onEdgesChange = usePipelineStore(s => s.onEdgesChange)
  const onConnect     = usePipelineStore(s => s.onConnect)
  const addNode           = usePipelineStore(s => s.addNode)
  const pushSnapshot      = usePipelineStore(s => s.pushSnapshot)
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId)

  // Port-type validation: source type must equal target type
  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) return false
      const { nodes: storeNodes } = usePipelineStore.getState()
      const srcNode = storeNodes.find(n => n.id === connection.source)
      const tgtNode = storeNodes.find(n => n.id === connection.target)
      if (!srcNode || !tgtNode) return false
      const srcPort = srcNode.data.manifest.outputs.find(p => p.id === connection.sourceHandle)
      const tgtPort = tgtNode.data.manifest.inputs.find(p => p.id === connection.targetHandle)
      return srcPort?.type === tgtPort?.type
    },
    []
  )

  // ── Drag-and-drop from sidebar ────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const nodeId = e.dataTransfer.getData(DND_MIME)
      if (!nodeId || !rfInstanceRef.current) return
      const manifest = manifests.find(m => m.id === nodeId)
      if (!manifest) return
      const position = rfInstanceRef.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      })
      addNode(manifest, position)
    },
    [manifests, addNode]
  )

  // Save drag-end position to history
  const onNodeDragStop = useCallback(() => {
    pushSnapshot()
  }, [pushSnapshot])

  const openOutputPanel = useCallback((nodeId: string) => {
    // Dynamically import to avoid circular store dependency
    import('@/store/executionStore').then(({ useExecutionStore }) => {
      const { nodeOutputs, openOutputPanel: open } = useExecutionStore.getState()
      if (nodeOutputs[nodeId]) open(nodeId)
    })
  }, [])

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    setSelectedNodeId(node.id)
  }, [setSelectedNodeId])

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_e, node) => {
    openOutputPanel(node.id)
  }, [openOutputPanel])

  const onNodeContextMenu: NodeMouseHandler = useCallback((e, node) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId: node.id,
      nodeType: (node.data as { manifest?: { id?: string } })?.manifest?.id ?? '',
    })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    const { nodes: cur, edges: curEdges } = usePipelineStore.getState()
    onNodesChange(cur.filter(n => n.id === nodeId).map(n => ({ type: 'remove' as const, id: n.id })))
    onEdgesChange(curEdges.filter(e => e.source === nodeId || e.target === nodeId).map(e => ({ type: 'remove' as const, id: e.id })))
    pushSnapshot()
  }, [onNodesChange, onEdgesChange, pushSnapshot])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setContextMenu(null)
  }, [setSelectedNodeId])

  return (
    <main
      className={cn('canvas-grid relative flex-1 overflow-hidden')}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onInit={instance => { rfInstanceRef.current = instance }}
        nodeTypes={NODE_TYPES}
        isValidConnection={isValidConnection}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="hsl(222 15% 18%)"
          className="opacity-60"
        />

        <Controls
          className="!bottom-4 !left-4 !top-auto [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-muted"
          showInteractive={false}
        />

        <MiniMap
          className="!bottom-4 !right-4 !top-auto !bg-card !border !border-border rounded-lg overflow-hidden"
          nodeColor={node => {
            const manifest = (node.data as { manifest?: { color?: string } })?.manifest
            return manifest?.color ?? '#94a3b8'
          }}
          maskColor="hsl(222 20% 7% / 0.7)"
        />
      </ReactFlow>

      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          nodeType={contextMenu.nodeType}
          onClose={closeContextMenu}
          onDelete={deleteNode}
        />
      )}

      {/* Empty state overlay */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <svg
                className="h-6 w-6 text-primary/60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="8" width="7" height="8" rx="1" />
                <rect x="14" y="8" width="7" height="8" rx="1" />
                <path d="M10 12h4" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              Drag a node from the sidebar to start
            </p>
          </div>
        </div>
      )}
    </main>
  )
}

// Export the DND_MIME constant so the sidebar can use it
export { DND_MIME }
