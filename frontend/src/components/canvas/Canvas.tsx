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
import { NodePickerPopup } from './NodePickerPopup'
import { usePipelineStore } from '@/store/pipelineStore'
import { useUIStore } from '@/store/uiStore'
import type { NodeManifestWithUI, PortType } from '@/lib/types'
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

interface NodePickerState {
  /** Screen position */
  x: number
  y: number
  /** Flow-space position for node placement */
  flowX: number
  flowY: number
  /** If opened from a connection drop, the source info for auto-connect */
  pendingConnection?: {
    sourceNodeId: string
    sourceHandleId: string
    portType: PortType
  }
}

export function Canvas({ manifests }: CanvasProps) {
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [nodePicker, setNodePicker] = useState<NodePickerState | null>(null)
  // Track the pending connection source while dragging
  const pendingConnRef = useRef<{ nodeId: string; handleId: string } | null>(null)

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

  // ── Connection-drop: track pending connection ────────────────────────────

  const onConnectStart = useCallback(
    (_event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
      if (params.nodeId && params.handleId && params.handleType === 'source') {
        pendingConnRef.current = { nodeId: params.nodeId, handleId: params.handleId }
      }
    },
    []
  )

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const pending = pendingConnRef.current
      pendingConnRef.current = null
      if (!pending || !rfInstanceRef.current) return

      // Check if the drop landed on a valid target (a handle element)
      const target = event.target as HTMLElement
      if (target.closest('.react-flow__handle')) return

      // Find the source port type
      const { nodes: storeNodes } = usePipelineStore.getState()
      const srcNode = storeNodes.find(n => n.id === pending.nodeId)
      const srcPort = srcNode?.data.manifest.outputs.find(p => p.id === pending.handleId)
      if (!srcPort) return

      const clientX = 'clientX' in event ? event.clientX : event.changedTouches[0].clientX
      const clientY = 'clientY' in event ? event.clientY : event.changedTouches[0].clientY
      const flowPos = rfInstanceRef.current.screenToFlowPosition({ x: clientX, y: clientY })

      setNodePicker({
        x: clientX,
        y: clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
        pendingConnection: {
          sourceNodeId: pending.nodeId,
          sourceHandleId: pending.handleId,
          portType: srcPort.type,
        },
      })
    },
    []
  )

  // ── Right-click on empty canvas ──────────────────────────────────────────

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      if (!rfInstanceRef.current) return
      const flowPos = rfInstanceRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      setNodePicker({
        x: event.clientX,
        y: event.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      })
    },
    []
  )

  // ── Node picker select handler ───────────────────────────────────────────

  const onNodePickerSelect = useCallback(
    (manifest: NodeManifestWithUI) => {
      if (!nodePicker) return
      const position = { x: nodePicker.flowX, y: nodePicker.flowY }
      addNode(manifest, position)

      // If opened from a connection drop, auto-connect
      if (nodePicker.pendingConnection) {
        const { sourceNodeId, sourceHandleId, portType } = nodePicker.pendingConnection
        // Find the first compatible input port on the new node
        const targetPort = manifest.inputs.find(p => p.type === portType)
        if (targetPort) {
          // The new node ID follows the pattern in addNode: `${manifest.id}-${Date.now()}`
          // We need to read the most recent node from the store after addNode
          requestAnimationFrame(() => {
            const { nodes: latestNodes } = usePipelineStore.getState()
            const newNode = latestNodes[latestNodes.length - 1]
            if (newNode) {
              onConnect({
                source: sourceNodeId,
                sourceHandle: sourceHandleId,
                target: newNode.id,
                targetHandle: targetPort.id,
              })
            }
          })
        }
      }

      setNodePicker(null)
    },
    [nodePicker, addNode, onConnect]
  )

  const closeNodePicker = useCallback(() => {
    setNodePicker(null)
  }, [])

  const openOutputPanel = useCallback((nodeId: string) => {
    // Dynamically import to avoid circular store dependency
    import('@/store/executionStore').then(({ useExecutionStore }) => {
      const { nodeOutputs, nodeErrors, openOutputPanel: open } = useExecutionStore.getState()
      if (nodeOutputs[nodeId] || nodeErrors[nodeId]) open(nodeId)
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
    setNodePicker(null)
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
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onPaneContextMenu={onPaneContextMenu}
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

      {nodePicker && (
        <NodePickerPopup
          x={nodePicker.x}
          y={nodePicker.y}
          manifests={manifests}
          filterPortType={nodePicker.pendingConnection?.portType ?? null}
          onSelect={onNodePickerSelect}
          onClose={closeNodePicker}
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
