import { useState, useCallback } from 'react'
import { useWallet } from '@meshsdk/react'
import { MeshTxBuilder, BlockfrostProvider } from '@meshsdk/core'
import { bech32 } from 'bech32'

// Fix for cbor-js missing types — declare inline so no @types needed
declare module 'cbor-js' {
  export function decode(buffer: ArrayBuffer): any
  export function encode(value: any): ArrayBuffer
}
import * as CBOR from 'cbor-js'

const CONTRACT_ADDRESS = 'addr_test1wpg4cz6hz0c8q55z8pyejj35e7wx8schf4nmyxcr4ucq90c2jqfh9'

// Fix for import.meta.env — use window or fallback for Vite env vars
const BLOCKFROST_KEY = (import.meta as any).env?.VITE_BLOCKFROST_KEY as string ?? ''

// VOTE_2025_PH token identifiers (from P1's plutus.json)
const VOTE_POLICY_ID      = '4e1cdbfe3e52395946921cf56878719cdfe211dde196a337df118864'
const VOTE_TOKEN_NAME_HEX = '564f54455f323032355f5048' // hex of "VOTE_2025_PH"
const VOTE_ASSET_UNIT     = VOTE_POLICY_ID + VOTE_TOKEN_NAME_HEX

interface WalletAsset {
  unit: string
  quantity: string
}

interface UseContractReturn {
  submitVote: () => Promise<string | null>
  getVoteCount: () => Promise<number>
  checkEligibility: () => Promise<boolean>
  hasUserVoted: () => Promise<boolean>  // kept for VoteButton.tsx compatibility — uses token check internally
  isLoading: boolean
  error: string | null
  txHash: string | null
}

// ── helpers (kept from original) ──────────────────────────────────────────────

function parseCborUtxo(cborHex: string) {
  const bytes = new Uint8Array(cborHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  const decoded = CBOR.decode(bytes.buffer)
  const txHashBytes = decoded[0][0]
  const txHash = Array.from(txHashBytes as number[])
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('')
  const outputIndex = decoded[0][1]
  return { txHash, outputIndex }
}

function hexAddressToBech32(hexAddr: string): string {
  const bytes = new Uint8Array(hexAddr.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  const words = bech32.toWords(bytes)
  return bech32.encode('addr_test', words, 1000)
}

function assembleTransaction(unsignedTxHex: string, witnessHex: string): string {
  const trailer = 'a0f5d90103a0'
  const trailerIdx = unsignedTxHex.lastIndexOf(trailer)
  if (trailerIdx === -1) throw new Error('Cannot find trailer in unsigned tx')
  const txBodyHex = unsignedTxHex.slice(2, trailerIdx)
  return '84' + txBodyHex + witnessHex + 'f5' + 'd90103a0'
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useContract(): UseContractReturn {
  const { wallet, connected } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [txHash, setTxHash]       = useState<string | null>(null)

  // [T8] Check eligibility via native VOTE token — replaces localStorage
  const checkEligibility = useCallback(async (): Promise<boolean> => {
    try {
      if (!wallet || !connected) return false

      // getBalanceMesh() returns Asset[] with { unit, quantity }
      const balance: WalletAsset[] = await wallet.getBalanceMesh()

      const hasVoteToken = balance.some(
        (asset: WalletAsset) =>
          asset.unit === VOTE_ASSET_UNIT &&
          parseInt(asset.quantity) > 0
      )

      if (!hasVoteToken) {
        setError('You are not eligible to vote. VOTE_2025_PH token not found in wallet.')
      }

      return hasVoteToken
    } catch (err) {
      console.error('[checkEligibility] Error:', err)
      return false
    }
  }, [wallet, connected])

  const submitVote = useCallback(async (): Promise<string | null> => {
    if (!connected || !wallet) {
      setError('Wallet not connected')
      return null
    }

    // Gate vote submission behind token eligibility check
    const eligible = await checkEligibility()
    if (!eligible) return null

    setIsLoading(true)
    setError(null)
    setTxHash(null)

    try {
      const utxos = await wallet.getUtxos()

      if (!utxos || utxos.length === 0) {
        setError('No UTxOs available. Make sure your wallet has testnet ADA.')
        return null
      }

      const rawChangeAddress = await wallet.getChangeAddress()
      const changeAddress = rawChangeAddress.startsWith('addr')
        ? rawChangeAddress
        : hexAddressToBech32(rawChangeAddress)

      const { txHash: inputTxHash, outputIndex } = parseCborUtxo(utxos[0] as unknown as string)

      const blockfrostProvider = new BlockfrostProvider(BLOCKFROST_KEY)
      const txBuilder = new MeshTxBuilder({
        fetcher: blockfrostProvider,
        submitter: blockfrostProvider,
      })

      const unsignedTx = await txBuilder
        .txIn(inputTxHash, outputIndex)
        .txOut(CONTRACT_ADDRESS, [{ unit: 'lovelace', quantity: '2000000' }])
        .changeAddress(changeAddress)
        .complete()

      const signedWitnesses = await wallet.signTx(unsignedTx, false)
      const fullSignedTx    = assembleTransaction(unsignedTx, signedWitnesses)
      const submittedTxHash = await blockfrostProvider.submitTx(fullSignedTx)

      setTxHash(submittedTxHash)
      return submittedTxHash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Vote submission failed: ${errorMessage}`)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [connected, wallet, checkEligibility])

  const getVoteCount = useCallback(async (): Promise<number> => {
    try {
      // TODO: Query contract state via Blockfrost (Increment 3)
      return 0
    } catch (err) {
      console.error('Vote count query error:', err)
      return 0
    }
  }, [])

  // hasUserVoted is kept as an alias so VoteButton.tsx (P3) doesn't break
  // internally it now uses the real token check instead of localStorage
  const hasUserVoted = checkEligibility

  return { submitVote, getVoteCount, checkEligibility, hasUserVoted, isLoading, error, txHash }
}