import { useCallback, useEffect, useRef } from 'react'
import { useExecutionStore, type PortOutputMap } from '@/store/executionStore'
import { usePipelineStore } from '@/store/pipelineStore'
import type { PipelineJSON } from '@/lib/types'

const WS_URL = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000') + '/ws'
const RECONNECT_DELAY_MS = 3000

export function useWebSocket() {
  const wsRef      = useRef<WebSocket | null>(null)

  const pingRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

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
      // Reconnect after delay
      setTimeout(connect, RECONNECT_DELAY_MS)
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
      return
    }

    if (type === 'execution_done') {
      store.setRunning(false)
      return
    }

    if (type === 'execution_error') {
      store.setRunning(false)
      const nodeId = msg.node_id as string | undefined
      if (nodeId) store.setNodeStatus(nodeId, 'error')
      return
    }

    if (type === 'node_status') {
      const nodeId = msg.node_id as string
      const status = msg.status as 'running' | 'success' | 'error'

      store.setNodeStatus(nodeId, status)

      if (status === 'success' && msg.output) {
        store.setNodeOutputs(nodeId, msg.output as PortOutputMap)
      }

      // Mirror status onto the React Flow node data
      usePipelineStore.getState().updateNodeStatus(nodeId, status)
    }
  }

  useEffect(() => {
    connect()
    return () => {
      if (pingRef.current) clearInterval(pingRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  /** Send a pipeline execution request over the WebSocket. */
  const executePipeline = useCallback((pipeline: PipelineJSON) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected')
      return
    }

    // Reset statuses for all nodes in this pipeline
    const store = useExecutionStore.getState()
    store.clearExecution()
    pipeline.nodes.forEach(n => store.setNodeStatus(n.id, 'idle'))

    ws.send(JSON.stringify({ type: 'execute', pipeline }))
  }, [])

  return { executePipeline }
}
