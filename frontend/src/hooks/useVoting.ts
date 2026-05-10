// frontend/src/hooks/useVoting.ts
// [P2] T9 + T12 - Ballot Transaction Hook with full error handling

import { useState, useCallback } from 'react'
import { useWallet } from '@meshsdk/react'
import { MeshTxBuilder, BlockfrostProvider, BrowserWallet } from '@meshsdk/core'
import type { UTxO } from '@meshsdk/core'
import type { BallotChoices, BallotMetadata } from '../lib/metadataSchema'
import { bech32 } from 'bech32'
import { assembleTransaction } from './useContract'

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOCKFROST_KEY = (import.meta as any).env?.VITE_BLOCKFROST_KEY as string ?? ''

const VOTE_POLICY_ID      = '4e1cdbfe3e52395946921cf56878719cdfe211dde196a337df118864'
const VOTE_TOKEN_NAME_HEX = '564f54455f323032355f5048' // hex of "VOTE_2025_PH"
const VOTE_ASSET_UNIT     = VOTE_POLICY_ID + VOTE_TOKEN_NAME_HEX

const METADATA_LABEL_MSG  = 674
const METADATA_LABEL_VOTE = 1337

const EXPECTED_NETWORK_ID = 0 // 0 = testnet (Preprod)

// ── Types ─────────────────────────────────────────────────────────────────────

export type VotingStatus =
  | 'idle'
  | 'checking'
  | 'building'
  | 'signing'
  | 'submitting'
  | 'confirmed'
  | 'failed'

// [T12] Typed error codes for each failure case
export type VotingErrorCode =
  | 'WALLET_DISCONNECTED'
  | 'WRONG_NETWORK'
  | 'MISSING_TOKEN'
  | 'INSUFFICIENT_ADA'
  | 'NO_COLLATERAL'
  | 'METADATA_TOO_LARGE'
  | 'TX_REJECTED'
  | 'USER_CANCELLED'
  | 'UNKNOWN'

export interface VotingError {
  code: VotingErrorCode
  message: string
}

interface UseVotingReturn {
  submitBallot: (ballot: BallotChoices, electionId: string) => Promise<string | null>
  checkEligibility: () => Promise<boolean>
  getTransactionStatus: (txHash: string) => Promise<string>
  status: VotingStatus
  txHash: string | null
  error: string | null
  errorCode: VotingErrorCode | null  // [T12] exposed for UI error banners
  isLoading: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 10)
}

// [T12] Parse raw blockchain errors into friendly typed errors
function parseBlockchainError(err: unknown): VotingError {
  const raw = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()

  if (raw.includes('user declined') || raw.includes('cancelled') || raw.includes('rejected by user')) {
    return { code: 'USER_CANCELLED', message: 'Transaction was cancelled. Please try again.' }
  }
  if (raw.includes('insufficient') || raw.includes('not enough') || raw.includes('balance too small')) {
    return { code: 'INSUFFICIENT_ADA', message: 'Insufficient ADA. Please add more testnet ADA to your wallet.' }
  }
  if (raw.includes('collateral')) {
    return { code: 'NO_COLLATERAL', message: 'No collateral set. Please enable collateral in your Eternl wallet settings.' }
  }
  if (raw.includes('metadata') && (raw.includes('too large') || raw.includes('size'))) {
    return { code: 'METADATA_TOO_LARGE', message: 'Ballot metadata is too large. Please reduce your selections.' }
  }
  if (raw.includes('submit') || raw.includes('rejected') || raw.includes('validation')) {
    return { code: 'TX_REJECTED', message: 'Transaction was rejected by the blockchain. Please try again.' }
  }

  return {
    code: 'UNKNOWN',
    message: `Vote submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
}

function hexAddressToBech32(hexAddr: string): string {
  const bytes = new Uint8Array(hexAddr.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  const words = bech32.toWords(bytes)
  return bech32.encode('addr_test', words, 1000)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVoting(): UseVotingReturn {
  const { wallet, connected } = useWallet()

  const [status, setStatus]       = useState<VotingStatus>('idle')
  const [txHash, setTxHash]       = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<VotingErrorCode | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Helper to set error + code + status together
  const setVotingError = (votingError: VotingError) => {
    setError(votingError.message)
    setErrorCode(votingError.code)
    setStatus('failed')
  }

  // ── checkEligibility ────────────────────────────────────────────────────────
  const checkEligibility = useCallback(async (): Promise<boolean> => {
  try {
    // ── DEBUG BYPASS ──────────────────────────────────────────────
    // Set VITE_DEBUG_SKIP_TOKEN_CHECK=true in .env.local to skip
    // token verification during development/testing.
    const debugSkip = (import.meta as any).env?.VITE_DEBUG_SKIP_TOKEN_CHECK === 'true'

    if (!wallet || !connected) {
      setVotingError({ code: 'WALLET_DISCONNECTED', message: 'Wallet is not connected. Please connect your wallet first.' })
      return false
    }

    setStatus('checking')

    const networkId = await wallet.getNetworkId()
    if (networkId !== EXPECTED_NETWORK_ID) {
      setVotingError({ code: 'WRONG_NETWORK', message: 'Wrong network. Please switch to Cardano Preprod testnet in your Eternl wallet.' })
      return false
    }

    // Skip token check when debugging
    if (debugSkip) {
      console.warn('[DEBUG] Token check skipped — VITE_DEBUG_SKIP_TOKEN_CHECK=true')
      setStatus('idle')
      setError(null)
      setErrorCode(null)
      return true
    }

    const balance = await wallet.getBalanceMesh()
    const hasToken = balance.some(
      (asset: { unit: string; quantity: string }) =>
        asset.unit === VOTE_ASSET_UNIT && parseInt(asset.quantity) > 0
    )

    if (!hasToken) {
      setVotingError({ code: 'MISSING_TOKEN', message: 'Not eligible: VOTE_2025_PH token not found in wallet.' })
      return false
    }

    setStatus('idle')
    setError(null)
    setErrorCode(null)
    return true

  } catch (err) {
    console.error('[checkEligibility] Error:', err)
    setVotingError({ code: 'UNKNOWN', message: 'Failed to check eligibility. Please try again.' })
    return false
  }
}, [wallet, connected])

  // ── submitBallot ──────────────────────────────────────────────────────────
  const submitBallot = useCallback(async (
    ballot: BallotChoices,
    electionId: string
  ): Promise<string | null> => {

    setError(null)
    setErrorCode(null)
    setTxHash(null)
    setIsLoading(true)

    try {
      // Step 1 — Check eligibility (wallet + network + token)
      const eligible = await checkEligibility()
      if (!eligible) {
        setIsLoading(false)
        return null
      }

      // Step 2 — Build metadata
      setStatus('building')
      const metadata: BallotMetadata = {
        electionId,
        ballot,
        timestamp: Date.now(),
        nonce: generateNonce(),
      }

      // Step 3 — Get wallet data
      const rawChangeAddress = await wallet.getChangeAddress()
      const changeAddress = rawChangeAddress.startsWith('addr')
        ? rawChangeAddress
        : hexAddressToBech32(rawChangeAddress)
      const utxos: UTxO[]       = await wallet.getUtxosMesh()
      const collaterals: UTxO[] = await wallet.getCollateralMesh()

      // [T12] Insufficient ADA check
      if (!utxos || utxos.length === 0) {
        setVotingError({ code: 'INSUFFICIENT_ADA', message: 'No UTxOs available. Please add testnet ADA to your wallet.' })
        setIsLoading(false)
        return null
      }

      const lovelaceBalance = utxos
        .flatMap((u: UTxO) => u.output.amount)
        .filter((a: { unit: string }) => a.unit === 'lovelace')
        .reduce((sum: number, a: { unit: string; quantity: string }) => sum + parseInt(a.quantity), 0)

      if (lovelaceBalance < 2000000) {
        setVotingError({ code: 'INSUFFICIENT_ADA', message: 'Insufficient ADA. You need at least 2 ADA to submit a transaction.' })
        setIsLoading(false)
        return null
      }

      // Step 4 — Find vote token UTxO
      const debugSkip = (import.meta as any).env?.VITE_DEBUG_SKIP_TOKEN_CHECK === 'true'

      const voteTokenUtxo = utxos.find((utxo: UTxO) =>
        utxo.output.amount.some(
          (a: { unit: string }) => a.unit === VOTE_ASSET_UNIT
        )
      )

      if (!voteTokenUtxo && !debugSkip) {
        setVotingError({ code: 'MISSING_TOKEN', message: 'Vote token UTxO not found. Token may not be in this wallet.' })
        setIsLoading(false)
        return null
      }

    //   // [T12] No collateral check
    //   if (!collaterals || collaterals.length === 0) {
    //     setVotingError({ code: 'NO_COLLATERAL', message: 'No collateral set. In Eternl: Settings → Collateral → Set Collateral.' })
    //     setIsLoading(false)
    //     return null
    //   }

      // Step 5 — Build the transaction
      const provider  = new BlockfrostProvider(BLOCKFROST_KEY)
      const txBuilder = new MeshTxBuilder({
        fetcher: provider,
        submitter: provider,
      })

      txBuilder.selectUtxosFrom(utxos)

      // Step 6 — Collateral only needed when running Plutus scripts (not in debug mode)
      if (!debugSkip) {
        if (!collaterals || collaterals.length === 0) {
          setVotingError({ code: 'NO_COLLATERAL', message: 'No collateral set. In Eternl: Settings → Collateral → Set Collateral.' })
          setIsLoading(false)
          return null
        }
        const col = collaterals[0]
        txBuilder.txInCollateral(
          col.input.txHash,
          col.input.outputIndex,
          col.output.amount,
          col.output.address
        )
      }

      // Step 7 — Burn the vote token (T10) -> skipped for debug purposes
       if (!debugSkip) {
        txBuilder
          .mint('-1', VOTE_POLICY_ID, VOTE_TOKEN_NAME_HEX)
          .mintingScript('')          // TODO: replace with parameterizedScript when real tokens are ready
          .mintPlutusScriptV3()
          .mintRedeemerValue({ alternative: 1, fields: [] })
      } else {
        console.warn('[DEBUG] Burn step skipped — VITE_DEBUG_SKIP_TOKEN_CHECK=true')
      }

      // Step 8 — Attach ballot metadata (T11)
      // [T12] Validate metadata size before attaching
      const metadataPayload = {
        electionId: metadata.electionId,
        ballot:     metadata.ballot,
        timestamp:  metadata.timestamp,
        nonce:      metadata.nonce,
      }

      if (JSON.stringify(metadataPayload).length > 16384) {
        setVotingError({ code: 'METADATA_TOO_LARGE', message: 'Ballot metadata exceeds Cardano size limits. Please reduce your selections.' })
        setIsLoading(false)
        return null
      }

      txBuilder
        .metadataValue(METADATA_LABEL_MSG,  { msg: ['AmVote Ballot Submission'] })
        .metadataValue(METADATA_LABEL_VOTE, metadataPayload)

      // Step 9 — Set change address
      txBuilder.changeAddress(changeAddress)

      // Step 10 — Sign
      setStatus('signing')
      const unsignedTx = await txBuilder.complete()

      // Eternl returns witness-set only, not full tx — merge manually
      const witnessSet = await wallet!.signTx(unsignedTx, true)
      const fullSignedTx = BrowserWallet.addBrowserWitnesses(unsignedTx, witnessSet)

      // Step 11 — Submit
      setStatus('submitting')
      const submittedHash = await wallet!.submitTx(fullSignedTx)

    //   // Step 10 — Sign
    //   setStatus('signing')
    //   const unsignedTx = await txBuilder.complete()
    //   const signedTx   = await wallet!.signTx(unsignedTx, false)

    //   // Step 11 — Submit
    //   setStatus('submitting')
    //   const submittedHash = await wallet!.submitTx(signedTx)

      setTxHash(submittedHash)
      setStatus('confirmed')
      setError(null)
      setErrorCode(null)
      return submittedHash

    } catch (err) {
      console.error('[submitBallot] Raw error:', err)
      const votingError = parseBlockchainError(err)
      setVotingError(votingError)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [wallet, connected, checkEligibility])

  // ── getTransactionStatus ──────────────────────────────────────────────────
  const getTransactionStatus = useCallback(async (hash: string): Promise<string> => {
    try {
      const provider = new BlockfrostProvider(BLOCKFROST_KEY)
      const tx = await provider.fetchTxInfo(hash)
      return tx ? 'confirmed' : 'pending'
    } catch (err) {
      console.error('[getTransactionStatus] Error:', err)
      return 'pending'
    }
  }, [])

  return {
    submitBallot,
    checkEligibility,
    getTransactionStatus,
    status,
    txHash,
    error,
    errorCode,
    isLoading,
  }
}