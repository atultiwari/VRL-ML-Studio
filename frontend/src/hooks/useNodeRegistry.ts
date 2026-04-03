import { useCallback, useEffect, useState } from 'react'
import { getNodes } from '@/lib/api'
import type { NodeManifestWithUI } from '@/lib/types'

interface NodeRegistryState {
  manifests: NodeManifestWithUI[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useNodeRegistry(): NodeRegistryState {
  const [manifests, setManifests] = useState<NodeManifestWithUI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => {
    setTick(t => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getNodes()
      .then(data => {
        if (!cancelled) {
          setManifests(data)
          setLoading(false)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load nodes'
          setManifests([])
          setLoading(false)
          setError(message)
        }
      })

    return () => { cancelled = true }
  }, [tick])

  return { manifests, loading, error, refresh }
}
