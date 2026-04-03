import { useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Connection,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { NodeCard } from './NodeCard'
import { usePipelineStore } from '@/store/pipelineStore'
import type { NodeManifestWithUI } from '@/lib/types'
import { cn } from '@/lib/utils'

// Custom node type registry — must be stable (defined outside component)
const NODE_TYPES = { vrlNode: NodeCard }

const DND_MIME = 'application/vrl-node-id'

interface CanvasProps {
  manifests: NodeManifestWithUI[]
}

export function Canvas({ manifests }: CanvasProps) {
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)

  const nodes         = usePipelineStore(s => s.nodes)
  const edges         = usePipelineStore(s => s.edges)
  const onNodesChange = usePipelineStore(s => s.onNodesChange)
  const onEdgesChange = usePipelineStore(s => s.onEdgesChange)
  const onConnect     = usePipelineStore(s => s.onConnect)
  const addNode       = usePipelineStore(s => s.addNode)
  const pushSnapshot  = usePipelineStore(s => s.pushSnapshot)

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
        onInit={instance => { rfInstanceRef.current = instance }}
        nodeTypes={NODE_TYPES}
        isValidConnection={isValidConnection}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
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
