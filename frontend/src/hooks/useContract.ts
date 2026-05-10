import { bech32 } from 'bech32'
import { useVoting } from './useVoting'

// Fix for cbor-js missing types — declare inline so no @types needed
// declare module 'cbor-js' {
//   export function decode(buffer: ArrayBuffer): any
//   export function encode(value: any): ArrayBuffer
// }
import * as CBOR from 'cbor-js'

// ── Exported helpers (reusable by other hooks) ────────────────────────────────

export function parseCborUtxo(cborHex: string) {
  const bytes = new Uint8Array(cborHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  const decoded = CBOR.decode(bytes.buffer)
  const txHashBytes = decoded[0][0]
  const txHash = Array.from(txHashBytes as number[])
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('')
  const outputIndex = decoded[0][1]
  return { txHash, outputIndex }
}

export function hexAddressToBech32(hexAddr: string): string {
  const bytes = new Uint8Array(hexAddr.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  const words = bech32.toWords(bytes)
  return bech32.encode('addr_test', words, 1000)
}

export function assembleTransaction(unsignedTxHex: string, witnessHex: string): string {
  const trailer = 'a0f5d90103a0'
  const trailerIdx = unsignedTxHex.lastIndexOf(trailer)
  if (trailerIdx === -1) throw new Error('Cannot find trailer in unsigned tx')
  const txBodyHex = unsignedTxHex.slice(2, trailerIdx)
  return '84' + txBodyHex + witnessHex + 'f5' + 'd90103a0'
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseContractReturn {
  // Kept for VoteButton.tsx (P3) compatibility
  submitVote: () => Promise<string | null>
  hasUserVoted: () => Promise<boolean>
  isLoading: boolean
  error: string | null
  txHash: string | null
  // General contract methods
  getVoteCount: () => Promise<number>
}

export function useContract(): UseContractReturn {
  // Delegate everything to useVoting — single source of truth
  const {
    submitBallot,
    checkEligibility,
    isLoading,
    error,
    txHash,
  } = useVoting()

  // submitVote → calls submitBallot with empty ballot for now
  // P3/P4 will pass real ballot data once Ballot.tsx is ready (T14)
  const submitVote = async (): Promise<string | null> => {
    return submitBallot(
      { p: '', vp: '', s: [] },  // placeholder until Ballot.tsx passes real data
      'PH2026'                   // placeholder election ID
    )
  }

  // hasUserVoted → delegates to checkEligibility (token-based, not localStorage)
  const hasUserVoted = checkEligibility

  // getVoteCount — Increment 3
  const getVoteCount = async (): Promise<number> => {
    try {
      // TODO: Query contract state via Blockfrost (Increment 3)
      return 0
    } catch (err) {
      console.error('Vote count query error:', err)
      return 0
    }
  }

  return {
    submitVote,
    hasUserVoted,
    isLoading,
    error,
    txHash,
    getVoteCount,
  }
}