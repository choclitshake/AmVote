import { useState, useCallback } from 'react'
import { useWallet } from '@meshsdk/react'
import { BrowserWallet } from '@meshsdk/core'
import type { BallotChoices } from '../lib/metadataSchema'

export type VotingStatus =
  | 'idle'
  | 'building'
  | 'signing'
  | 'submitting'
  | 'confirmed'
  | 'failed'

export type VotingErrorCode =
  | 'WALLET_DISCONNECTED'
  | 'BACKEND_ERROR'
  | 'TX_REJECTED'
  | 'USER_CANCELLED'
  | 'UNKNOWN'

export interface VotingError {
  code: VotingErrorCode
  message: string
}

interface UseVotingReturn {
  submitBallot: (ballot: BallotChoices, electionId: string) => Promise<string | null>
  getTransactionStatus: (txHash: string) => Promise<string>
  status: VotingStatus
  txHash: string | null
  error: string | null
  errorCode: VotingErrorCode | null
  isLoading: boolean
}

const BACKEND_URL = 'http://localhost:3001'

function parseBlockchainError(err: unknown): VotingError {
  const raw = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  if (raw.includes('user declined') || raw.includes('cancelled') || raw.includes('rejected by user')) {
    return { code: 'USER_CANCELLED', message: 'Transaction was cancelled. Please try again.' }
  }
  if (raw.includes('submit') || raw.includes('rejected')) {
    return { code: 'TX_REJECTED', message: 'Transaction was rejected by the blockchain. Please try again.' }
  }
  return {
    code: 'UNKNOWN',
    message: `Vote submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
}

export function useVoting(): UseVotingReturn {
  const { wallet, connected } = useWallet()

  const [status, setStatus] = useState<VotingStatus>(() => {
    return (localStorage.getItem('AMVOTE_VOTING_STATUS') as VotingStatus) || 'idle'
  })
  const [txHash, setTxHash] = useState<string | null>(() => {
    return localStorage.getItem('AMVOTE_TX_HASH')
  })
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<VotingErrorCode | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const setVotingError = (votingError: VotingError) => {
    setError(votingError.message)
    setErrorCode(votingError.code)
    setStatus('failed')
  }

  const submitBallot = useCallback(async (
    ballot: BallotChoices,
    electionId: string
  ): Promise<string | null> => {
    setError(null)
    setErrorCode(null)
    setTxHash(null)
    setIsLoading(true)

    try {
      if (!wallet || !connected) {
        setVotingError({ code: 'WALLET_DISCONNECTED', message: 'Wallet is not connected.' })
        setIsLoading(false)
        return null
      }

      setStatus('building')
      const publicAddress = await wallet.getChangeAddress()
      const response = await fetch(`${BACKEND_URL}/api/build-vote-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicAddress, ballot, electionId })
      })

      if (!response.ok) {
        const data = await response.json()
        setVotingError({ code: 'BACKEND_ERROR', message: data.error || 'Failed to build transaction on backend' })
        setIsLoading(false)
        return null
      }

      const { unsignedTx } = await response.json()

      setStatus('signing')
      const witnessSet = await wallet.signTx(unsignedTx, true) 
      const fullySignedTx = BrowserWallet.addBrowserWitnesses(unsignedTx, witnessSet)

      setStatus('submitting')
      const submittedHash = await wallet.submitTx(fullySignedTx)

      setTxHash(submittedHash)
      setStatus('confirmed')
      localStorage.setItem('AMVOTE_TX_HASH', submittedHash)
      localStorage.setItem('AMVOTE_VOTING_STATUS', 'confirmed')
      setError(null)
      setErrorCode(null)
      return submittedHash

    } catch (err) {
      console.error('[submitBallot] Raw error:', err)
      setVotingError(parseBlockchainError(err))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [wallet, connected])

  const getTransactionStatus = useCallback(async (hash: string): Promise<string> => {
    return 'confirmed'
  }, [])

  return {
    submitBallot,
    getTransactionStatus,
    status,
    txHash,
    error,
    errorCode,
    isLoading,
  }
}