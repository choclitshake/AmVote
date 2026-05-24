import { useState, useEffect, useCallback, useRef } from 'react'

export type ElectionStatus = 'NotStarted' | 'Active' | 'Closed'

const BACKEND_URL = 'http://localhost:3001'

/** Format a millisecond duration like "2d 04h 30m 12s". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s'
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (days || hours) parts.push(`${String(hours).padStart(2, '0')}h`)
  parts.push(`${String(mins).padStart(2, '0')}m`)
  parts.push(`${String(secs).padStart(2, '0')}s`)
  return parts.join(' ')
}

/**
 * Reads the election status/schedule from the backend and ticks a live
 * countdown every second (using the server clock offset to avoid skew).
 */
export function useElection() {
  const [status, setStatus] = useState<ElectionStatus | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const offsetRef = useRef(0)       // serverNow - clientNow
  const [, forceTick] = useState(0) // re-render each second for the countdown

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/election`)
      if (!res.ok) return
      const d = await res.json()
      setStatus(d.status)
      setStartTime(d.startTime ?? null)
      setEndTime(d.endTime ?? null)
      offsetRef.current = (typeof d.now === 'number' ? d.now : Date.now()) - Date.now()
    } catch (err) {
      console.error('[useElection] failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Tick every second for the countdown; refetch status periodically.
  useEffect(() => {
    const tick = setInterval(() => forceTick(x => x + 1), 1000)
    const poll = setInterval(() => refresh(), 20000)
    return () => {
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [refresh])

  const now = Date.now() + offsetRef.current
  const msUntilStart = startTime ? Math.max(0, startTime - now) : null
  const msUntilEnd = endTime ? Math.max(0, endTime - now) : null

  return { status, startTime, endTime, now, msUntilStart, msUntilEnd, loading, refresh }
}
