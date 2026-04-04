import { useCallback, useEffect, useRef } from 'react'
import { useExecutionStore, type PortOutputMap } from '@/store/executionStore'
import { usePipelineStore } from '@/store/pipelineStore'
import type { PipelineJSON } from '@/lib/types'

// In production (nginx proxy), VITE_WS_URL is empty — derive from page origin.
// In dev mode, VITE_WS_URL points directly to the backend (ws://localhost:8000).
function resolveWsUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined
  if (envUrl) return envUrl + '/ws'
  // Derive from current page origin: https → wss, http → ws
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}
const WS_URL = resolveWsUrl()
const RECONNECT_DELAY_MS = 3000
const EXECUTION_TIMEOUT_MS = 120_000 // 2 minutes

export function useWebSocket() {
  const wsRef      = useRef<WebSocket | null>(null)
  const pingRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Guard against React StrictMode double-mount
  const mountedRef = useRef(false)

  const clearExecutionTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const startExecutionTimeout = () => {
    clearExecutionTimeout()
    timeoutRef.current = setTimeout(() => {
      const store = useExecutionStore.getState()
      if (!store.running) return
      // Timeout: mark all still-running nodes as error
      const statuses = store.nodeStatuses
      for (const [nodeId, status] of Object.entries(statuses)) {
        if (status === 'running') {
          store.setNodeStatus(nodeId, 'error')
          usePipelineStore.getState().updateNodeStatus(nodeId, 'error')
        }
      }
      store.setRunning(false)
    }, EXECUTION_TIMEOUT_MS)
  }

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    // Close any lingering CONNECTING socket (e.g. from StrictMode re-mount)
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      wsRef.current.close()
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      // Keep-alive ping every 25s
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
      }, 25_000)
    }

    ws.onmessage = (event: MessageEvent<string>) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      handleMessage(msg)
    }

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current)
      pingRef.current = null
      // Only reconnect if this component is still mounted
      if (mountedRef.current) {
        setTimeout(connect, RECONNECT_DELAY_MS)
      }

      // If execution was in progress when WS dropped, mark stale running nodes
      const store = useExecutionStore.getState()
      if (store.running) {
        const statuses = store.nodeStatuses
        for (const [nodeId, status] of Object.entries(statuses)) {
          if (status === 'running') {
            store.setNodeStatus(nodeId, 'error')
            usePipelineStore.getState().updateNodeStatus(nodeId, 'error')
          }
        }
        store.setRunning(false)
        clearExecutionTimeout()
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  const handleMessage = (msg: Record<string, unknown>) => {
    const store = useExecutionStore.getState()
    const type  = msg.type as string

    if (type === 'execution_start') {
      store.setRunning(true)
      startExecutionTimeout()
      return
    }

    if (type === 'execution_done') {
      clearExecutionTimeout()
      // Mark any nodes still stuck as "running" → "success" (they completed but status was lost)
      const statuses = store.nodeStatuses
      for (const [nodeId, status] of Object.entries(statuses)) {
        if (status === 'running') {
          store.setNodeStatus(nodeId, 'success')
          usePipelineStore.getState().updateNodeStatus(nodeId, 'success')
        }
      }
      store.setRunning(false)
      return
    }

    if (type === 'execution_error') {
      clearExecutionTimeout()
      store.setRunning(false)
      const nodeId = msg.node_id as string | undefined
      const errorMsg = msg.error as string | undefined
      if (nodeId) {
        store.setNodeStatus(nodeId, 'error')
        if (errorMsg) store.setNodeError(nodeId, errorMsg)
        usePipelineStore.getState().updateNodeStatus(nodeId, 'error')
      }
      // Mark any still-running nodes as idle (they never ran)
      const statuses = store.nodeStatuses
      for (const [nid, status] of Object.entries(statuses)) {
        if (status === 'running' && nid !== nodeId) {
          store.setNodeStatus(nid, 'idle')
          usePipelineStore.getState().updateNodeStatus(nid, 'idle')
        }
      }
      return
    }

    if (type === 'node_status') {
      const nodeId = msg.node_id as string
      const status = msg.status as 'running' | 'success' | 'error'

      store.setNodeStatus(nodeId, status)

      if (status === 'success' && msg.output) {
        store.setNodeOutputs(nodeId, msg.output as PortOutputMap)
      }

      if (status === 'error' && msg.error) {
        store.setNodeError(nodeId, msg.error as string)
      }

      // Mirror status onto the React Flow node data
      usePipelineStore.getState().updateNodeStatus(nodeId, status)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (pingRef.current) clearInterval(pingRef.current)
      clearExecutionTimeout()
      wsRef.current?.close()
    }
  }, [connect])

  /** Send a pipeline execution request over the WebSocket.
   *  If targetNodeIds is provided, only those nodes and their ancestors are executed.
   */
  const executePipeline = useCallback((pipeline: PipelineJSON, targetNodeIds?: string[]) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected — cannot execute pipeline')
      return
    }

    // Reset statuses for all nodes in this pipeline
    const store = useExecutionStore.getState()
    store.clearExecution()
    pipeline.nodes.forEach(n => store.setNodeStatus(n.id, 'idle'))

    const message: Record<string, unknown> = { type: 'execute', pipeline }
    if (targetNodeIds && targetNodeIds.length > 0) {
      message.target_node_ids = targetNodeIds
    }
    ws.send(JSON.stringify(message))
  }, [])

  return { executePipeline }
}
