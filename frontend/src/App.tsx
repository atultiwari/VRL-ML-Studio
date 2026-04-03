import { useEffect, useState } from 'react'
import { CanvasPlaceholder } from '@/components/canvas/CanvasPlaceholder'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { checkHealth } from '@/lib/api'

type BackendStatus = 'connecting' | 'online' | 'offline'

export function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('connecting')
  const [nodesLoaded, setNodesLoaded] = useState<number | undefined>()

  useEffect(() => {
    let cancelled = false

    const ping = async () => {
      try {
        const data = await checkHealth()
        if (!cancelled) {
          setBackendStatus('online')
          setNodesLoaded(data.nodes_loaded)
        }
      } catch {
        if (!cancelled) {
          setBackendStatus('offline')
        }
      }
    }

    ping()

    // Re-check every 30 seconds
    const interval = setInterval(ping, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <Toolbar backendStatus={backendStatus} nodesLoaded={nodesLoaded} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <CanvasPlaceholder />
      </div>
    </div>
  )
}
