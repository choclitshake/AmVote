import { useState, useEffect, useCallback } from 'react'
import { useWallet } from './useWallet'

export type VoterStatusValue = 'unregistered' | 'pending' | 'registered' | 'voted'

export interface VoterStatus {
  registered: boolean
  hasVoted: boolean
  status: VoterStatusValue
  voterId?: string
}

const BACKEND_URL = 'http://localhost:3001'

/**
 * Fetches the connected wallet's registration/voting status from the backend.
 * Replaces the old on-chain token-balance check for eligibility.
 */
export function useVoterStatus() {
  const { isConnected, address } = useWallet()
  const [voterStatus, setVoterStatus] = useState<VoterStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isConnected || !address) {
      setVoterStatus(null)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/status/${encodeURIComponent(address)}`)
      if (!res.ok) {
        setVoterStatus(null)
        return
      }
      setVoterStatus(await res.json())
    } catch (err) {
      console.error('[useVoterStatus] Failed to fetch status:', err)
      setVoterStatus(null)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { voterStatus, isLoading, refresh }
}
