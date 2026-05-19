// frontend/src/hooks/useVoting.ts
// [P2] T9 + T12 - Ballot Transaction Hook with full error handling

import { useState, useCallback } from 'react'
import { useWallet } from '@meshsdk/react'
import { MeshTxBuilder, BlockfrostProvider, BrowserWallet, applyParamsToScript, mConStr1 } from '@meshsdk/core'
import type { UTxO } from '@meshsdk/core'
import type { BallotChoices, BallotMetadata } from '../lib/metadataSchema'
import { bech32 } from 'bech32'
import { assembleTransaction } from './useContract'

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOCKFROST_KEY = (import.meta as any).env?.VITE_BLOCKFROST_KEY as string ?? ''

const COMPILED_SCRIPT = '5901b5010100229800aba2aba1aab9faab9eaab9dab9a9bae002488888896600264653001300800198041804800cdc3a400130080024888966002600460126ea800e2646644b300130050018acc004c034dd5003c00a2c80722b30013370e9001000c566002601a6ea801e00516403916402c80584c8cc8966002600c601a6ea80222b3001323300100137586022602460246024602400844b30010018a508acc004cdc79bae301200100d8a518998010011809800a01c404513300100225980099b8f375c601c0029110c564f54455f323032355f504800899b8848000dd69807800c528201a8a50403113300100225980099b8f375c601c00291010c564f54455f323032355f504800899b88375a601e00290004528201a40306464660020026eacc04000c8966002003003899192cc004cdc8803800c56600266e3c01c00626eacc04400a00a807a26600800860280068078dd718078009808800a02014bd6f7b630111919800800801912cc00400629462b3001300330120018998010011809800c528201c4044601c601c601c601c60166ea8008c028dd50029bae300c300a3754007164020300800130043754011149a26cac80101'
// Replace with the actual Admin PKH logged by mintVoteTokens.ts
const ADMIN_PKH = 'REPLACE_WITH_ADMIN_PKH'

// Lazy-initialize to avoid crash at module load when ADMIN_PKH is a placeholder
let _parameterizedScript: string | null = null
function getParameterizedScript(): string {
  if (!_parameterizedScript) {
    _parameterizedScript = applyParamsToScript(COMPILED_SCRIPT, [ADMIN_PKH], 'JSON')
  }
  return _parameterizedScript
}

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
          .mintingScript(getParameterizedScript())
          .mintPlutusScriptV3()
          .mintRedeemerValue(mConStr1([]))
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