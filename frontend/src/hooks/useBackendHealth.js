import { useState, useEffect, useCallback } from 'react'
import { checkHealth } from '../api/client'

/**
 * Polls /health every `interval` ms.
 * Returns { online: bool, checking: bool, recheck: fn }
 */
export function useBackendHealth(interval = 15000) {
  const [online,   setOnline]   = useState(null)   // null = unknown
  const [checking, setChecking] = useState(false)

  const recheck = useCallback(async () => {
    setChecking(true)
    const result = await checkHealth()
    setOnline(result?.status === 'ok')
    setChecking(false)
  }, [])

  useEffect(() => {
    recheck()
    const id = setInterval(recheck, interval)
    return () => clearInterval(id)
  }, [recheck, interval])

  return { online, checking, recheck }
}
