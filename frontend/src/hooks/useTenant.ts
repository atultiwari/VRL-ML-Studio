import { useEffect, useState } from 'react'
import { getTenantInfo, type TenantInfo } from '@/lib/api'

/**
 * Fetches the current tenant/workspace info from the backend on mount.
 * The backend sets a cookie automatically on first request, so this
 * always returns a workspace name after the initial round-trip.
 */
export function useTenant() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    getTenantInfo()
      .then((info) => {
        if (!cancelled) setTenant(info)
      })
      .catch(() => {
        // Tenant info is best-effort — don't block the app
      })
    return () => { cancelled = true }
  }, [])

  return tenant
}
