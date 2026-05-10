import { bech32 } from 'bech32'
import { useVoting } from './useVoting'
import * as CBOR from 'cbor-js'
import type { BallotChoices } from '../lib/metadataSchema'

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

interface UseContractReturn {
  submitVote: (ballot?: BallotChoices) => Promise<string | null>
  hasUserVoted: () => Promise<boolean>
  isLoading: boolean
  error: string | null
  txHash: string | null
  getVoteCount: () => Promise<number>
}

export function useContract(): UseContractReturn {
  const {
    submitBallot,
    checkEligibility,
    isLoading,
    error,
    txHash,
  } = useVoting()

  // Now accepts real ballot data from Ballot.tsx
  const submitVote = async (ballot?: BallotChoices): Promise<string | null> => {
    const realBallot: BallotChoices = ballot ?? { p: '', vp: '', s: [] }
    return submitBallot(realBallot, 'PH2026')
  }

  const hasUserVoted = checkEligibility

  const getVoteCount = async (): Promise<number> => {
    try {
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