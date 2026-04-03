import { useEffect, useState } from 'react'
import { getNodes } from '@/lib/api'
import type { NodeManifestWithUI } from '@/lib/types'

interface NodeRegistryState {
  manifests: NodeManifestWithUI[]
  loading: boolean
  error: string | null
}

export function useNodeRegistry(): NodeRegistryState {
  const [state, setState] = useState<NodeRegistryState>({
    manifests: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    getNodes()
      .then(manifests => {
        if (!cancelled) setState({ manifests, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load nodes'
          setState({ manifests: [], loading: false, error: message })
        }
      })

    return () => { cancelled = true }
  }, [])

  return state
}
