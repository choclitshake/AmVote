import { useState, useCallback, useEffect } from 'react'
import { useWallet } from './useWallet'
import { BrowserWallet } from '@meshsdk/core'
import type { BallotChoices } from '../lib/metadataSchema'

export type VotingStatus =
  | 'idle'
  | 'building'
  | 'signing'
  | 'submitting'
  | 'confirmed'
  | 'burn-pending'
  | 'burn-signing'
  | 'burn-submitting'
  | 'burn-confirmed'
  | 'failed'

export type VotingErrorCode =
  | 'WALLET_DISCONNECTED'
  | 'BACKEND_ERROR'
  | 'TX_REJECTED'
  | 'USER_CANCELLED'
  | 'UNKNOWN'
  | 'TOKEN_NOT_FOUND'

export interface VotingError {
  code: VotingErrorCode
  message: string
}

interface UseVotingReturn {
  submitBallot: (ballot: BallotChoices, electionId: string) => Promise<string | null>
  getTransactionStatus: (txHash: string) => Promise<string>
  burnBallotToken: () => Promise<string | null>
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
    message: `Submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useVoting(): UseVotingReturn {
  const { wallet, isConnected: connected, address } = useWallet()

  const [status, setStatus] = useState<VotingStatus>(() => {
    return (localStorage.getItem('AMVOTE_VOTING_STATUS') as VotingStatus) || 'idle'
  })
  const [txHash, setTxHash] = useState<string | null>(() => {
    return localStorage.getItem('AMVOTE_TX_HASH')
  })
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<VotingErrorCode | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [savedAddress, setSavedAddress] = useState<string | null>(() => {
    return localStorage.getItem('AMVOTE_VOTER_ADDRESS')
  })

  // Automatically clear stale voting sessions when wallet is disconnected or address changes
  useEffect(() => {
    if (!connected) {
      setStatus('idle');
      setTxHash(null);
      localStorage.removeItem('AMVOTE_VOTING_STATUS');
      localStorage.removeItem('AMVOTE_TX_HASH');
      localStorage.removeItem('AMVOTE_VOTER_ADDRESS');
      setSavedAddress(null);
    } else if (address && savedAddress && address !== savedAddress) {
      setStatus('idle');
      setTxHash(null);
      localStorage.removeItem('AMVOTE_VOTING_STATUS');
      localStorage.removeItem('AMVOTE_TX_HASH');
      localStorage.removeItem('AMVOTE_VOTER_ADDRESS');
      setSavedAddress(address);
    }
  }, [connected, address, savedAddress]);

  const setVotingError = (votingError: VotingError, isBurnPhase: boolean = false) => {
    setError(votingError.message)
    setErrorCode(votingError.code)
    if (isBurnPhase) {
      setStatus('confirmed') // revert to confirmed on burn failure so they can try again
    } else {
      setStatus('failed')
    }
  }

  const pollForConfirmation = async (hash: string) => {
    // Poll up to 18 times (3 minutes at 10s intervals)
    for (let i = 0; i < 18; i++) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/tx-status/${hash}`);
        const data = await res.json();
        if (data.confirmed) return true;
      } catch (err) {
        // ignore fetch errors and retry
      }
      await sleep(10000);
    }
    return false;
  };

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
      const rewardAddresses = await wallet.getRewardAddresses()
      const identityAddress = rewardAddresses[0] || await wallet.getChangeAddress()
      const changeAddress = await wallet.getChangeAddress()

      const response = await fetch(`${BACKEND_URL}/api/build-vote-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicAddress: identityAddress, changeAddress, ballot, electionId })
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
      localStorage.setItem('AMVOTE_VOTER_ADDRESS', address)
      setSavedAddress(address)
      setError(null)
      setErrorCode(null)

      // Start polling for confirmation
      pollForConfirmation(submittedHash).then((confirmed) => {
        if (confirmed) {
           console.log('Vote transaction confirmed on chain!');
        }
      });

      return submittedHash

    } catch (err) {
      console.error('[submitBallot] Raw error:', err)
      setVotingError(parseBlockchainError(err), false)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [wallet, connected, status])

  const burnBallotToken = useCallback(async (): Promise<string | null> => {
    setError(null)
    setErrorCode(null)
    setIsLoading(true)

    try {
      if (!wallet || !connected) {
        setVotingError({ code: 'WALLET_DISCONNECTED', message: 'Wallet is not connected.' }, true)
        setIsLoading(false)
        return null
      }

      setStatus('burn-pending')
      const rewardAddresses = await wallet.getRewardAddresses()
      const identityAddress = rewardAddresses[0] || await wallet.getChangeAddress()
      const changeAddress = await wallet.getChangeAddress()

      // Let the backend find the UTXO via Blockfrost — the raw CIP-30 UTXOs
      // returned by wallet.getUtxos() are undecoded CBOR strings, not structured objects.
      const response = await fetch(`${BACKEND_URL}/api/build-burn-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicAddress: identityAddress, voterChangeAddress: changeAddress })
      })

      if (!response.ok) {
        const data = await response.json()
        setVotingError({ code: 'BACKEND_ERROR', message: data.error || 'Failed to build burn transaction on backend' }, true)
        setIsLoading(false)
        return null
      }

      const { unsignedTx } = await response.json()

      setStatus('burn-signing')
      const witnessSet = await wallet.signTx(unsignedTx, true) 
      const fullySignedTx = BrowserWallet.addBrowserWitnesses(unsignedTx, witnessSet)

      setStatus('burn-submitting')
      const submittedHash = await wallet.submitTx(fullySignedTx)

      setStatus('burn-confirmed')
      localStorage.setItem('AMVOTE_VOTING_STATUS', 'burn-confirmed')
      setError(null)
      setErrorCode(null)
      return submittedHash

    } catch (err) {
      console.error('[burnBallotToken] Raw error:', err)
      setVotingError(parseBlockchainError(err), true)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [wallet, connected]);

  const getTransactionStatus = useCallback(async (hash: string): Promise<string> => {
    return status.includes('burn-confirmed') ? 'burn-confirmed' : 'confirmed'
  }, [status])

  return {
    submitBallot,
    burnBallotToken,
    getTransactionStatus,
    status,
    txHash,
    error,
    errorCode,
    isLoading,
  }
}