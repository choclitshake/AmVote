/// <reference types="vite/client" />
import { useState, useCallback } from 'react'
import { useWallet } from '@meshsdk/react'
import { MeshTxBuilder, BlockfrostProvider, Transaction } from '@meshsdk/core'
import * as CBOR from 'cbor-js'
import { bech32 } from 'bech32'

// Contract address on Cardano Testnet (from P1)
const CONTRACT_ADDRESS = 'addr_test1wpg4cz6hz0c8q55z8pyejj35e7wx8schf4nmyxcr4ucq90c2jqfh9'

// Blockfrost API for testnet
const BLOCKFROST_KEY = import.meta.env.VITE_BLOCKFROST_KEY as string

interface UseContractReturn {
    submitVote: () => Promise<string | null>
    getVoteCount: () => Promise<number>
    hasUserVoted: () => Promise<boolean>
    isLoading: boolean
    error: string | null
    txHash: string | null
}

// ABI structure - adjust based on P1's contract
interface ContractDatum {
    voteCount: number
}

function parseCborUtxo(cborHex: string) {
  const bytes = new Uint8Array(cborHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  const decoded = CBOR.decode(bytes.buffer)
  // decoded[0] = [txHash bytes, outputIndex]
  // decoded[1] = [address bytes, [lovelace, ...]]
  const txHashBytes = decoded[0][0]
  const txHash = Array.from(txHashBytes as number[]).map((b: number) => b.toString(16).padStart(2, '0')).join('')
  const outputIndex = decoded[0][1]
  return { txHash, outputIndex }
}

function hexAddressToBech32(hexAddr: string): string {
  const bytes = new Uint8Array(hexAddr.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  const words = bech32.toWords(bytes)
  return bech32.encode('addr_test', words, 1000)
}

function assembleTransaction(unsignedTxHex: string, witnessHex: string): string {
  // Unsigned tx structure: 84 + txBody + a0 + f5 + d90103a0
  // We need:              84 + txBody + witnessHex + f5 + d90103a0
  
  const EMPTY_WITNESS = 'a0'
  const IS_VALID = 'f5'
  const AUX_DATA = 'd90103a0'
  
  const trailer = EMPTY_WITNESS + IS_VALID + AUX_DATA  // 'a0f5d90103a0'
  const trailerIdx = unsignedTxHex.lastIndexOf(trailer)
  
  if (trailerIdx === -1) {
    throw new Error('Cannot find trailer in unsigned tx. Unsigned tx: ' + unsignedTxHex)
  }
  
  // txBody is everything between the leading '84' and the trailer
  const txBodyHex = unsignedTxHex.slice(2, trailerIdx)
  
  const result = '84' + txBodyHex + witnessHex + IS_VALID + AUX_DATA
  console.log('Assembled tx breakdown:')
  console.log('  txBody starts with:', txBodyHex.substring(0, 10))
  console.log('  witness starts with:', witnessHex.substring(0, 10))
  console.log('  result starts with:', result.substring(0, 10))
  console.log('  result length:', result.length)
  
  return result
}

export function useContract(): UseContractReturn {
    const { wallet, connected } = useWallet()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [txHash, setTxHash] = useState<string | null>(null)

    // Submit a vote to the contract
    const submitVote = useCallback(async (): Promise<string | null> => {
        if (!connected || !wallet) {
        setError('Wallet not connected')
        return null
        }

        setIsLoading(true)
        setError(null)
        setTxHash(null)

        try {
            // Step 1: Build transaction
            //   const builder = new MeshTxBuilder({
            //     fetcher: new BlockfrostProvider(BLOCKFROST_KEY),
            //     submitter: new BlockfrostProvider(BLOCKFROST_KEY),
            //   })

            const utxos = await wallet.getUtxos()
            console.log('UTxO[0] raw:', JSON.stringify(utxos[0]))
            // const changeAddress = await wallet.getChangeAddress()
            const rawChangeAddress = await wallet.getChangeAddress()
            const changeAddress = rawChangeAddress.startsWith('addr')
                ? rawChangeAddress
                : hexAddressToBech32(rawChangeAddress)
            console.log('Change address (bech32):', changeAddress)

            if (!utxos || utxos.length === 0) {
                setError('No UTxOs available. Make sure your wallet has testnet ADA.')
                setIsLoading(false)
                return null
            }

            const { txHash: inputTxHash, outputIndex } = parseCborUtxo(utxos[0] as unknown as string)
            console.log('Parsed txHash:', inputTxHash, 'index:', outputIndex)

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


            // // Parse the first UTxO string to get txHash and outputIndex
            // // UTxO string format: "txHash#index"
            // const [txHash, outputIndexStr] = utxos[0].split('#')
            // const outputIndex = parseInt(outputIndexStr, 10)
            // console.log('Voter address:', changeAddress)

            // const blockfrostProvider = new BlockfrostProvider(BLOCKFROST_KEY)

            // const txBuilder = new MeshTxBuilder({
            //     fetcher: blockfrostProvider,
            //     submitter: blockfrostProvider,
            // })

            // const unsignedTx = await txBuilder
            //     .txIn(txHash, outputIndex)
            //     .txOut(CONTRACT_ADDRESS, [{ unit: 'lovelace', quantity: '2000000' }])
            //     .changeAddress(changeAddress)
            //     .complete()

            // const txBuilder = new MeshTxBuilder({
            //     fetcher: blockfrostProvider,
            //     submitter: blockfrostProvider,
            // })

            // // Add this to submitVote function before sending:
            // const utxos = await wallet.getUtxos()
            // console.log('Available UTxOs:', utxos)
            // // If utxos are strings, you cannot access utxo.output directly.
            // // Remove the balance calculation or parse UTxOs if needed.
            // // For now, just log the count:
            // console.log('Total UTxOs:', utxos.length)

            // // Build transaction: Send 2 ADA to contract to vote
            // const unsignedTx = await txBuilder
            // .txOut(CONTRACT_ADDRESS, [{ unit: 'lovelace', quantity: '200000' }]) // 2 ADA
            // .changeAddress(changeAddress)
            // .complete()

            console.log('Transaction built:', unsignedTx)

            // Sign with wallet
            // const signedTx = await wallet.signTx(unsignedTx, false)
            // console.log('Transaction signed')       
            // console.log('Signed tx:', signedTx)

            /// Submit to blockchain
            // const submittedTxHash = await wallet.submitTx(signedTx)
            // const submittedTxHash = await blockfrostProvider.submitTx(signedTx)
            const signedWitnesses = await wallet.signTx(unsignedTx, false)
            console.log('Signed witnesses:', signedWitnesses)

            const fullSignedTx = assembleTransaction(unsignedTx, signedWitnesses)
            console.log('Full signed tx prefix:', fullSignedTx.substring(0, 10))

            const submittedTxHash = await blockfrostProvider.submitTx(fullSignedTx)
            console.log('Transaction submitted:', submittedTxHash)

            setTxHash(submittedTxHash)
            return submittedTxHash
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setError(`Vote submission failed: ${errorMessage}`)
            console.error('Vote submission error:', err)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [connected, wallet])

    const hasUserVoted = useCallback(async (): Promise<boolean> => {
        try {
            if (!wallet) return false
            // TODO: Query contract's voters list via Blockfrost
            // For now, return false (will be implemented in Increment 2)
            return false
        } catch (err) {
            console.error('Error checking vote status:', err)
            return false
        }
    }, [wallet])

    // Query vote count from contract (optional - for displaying results)
    const getVoteCount = useCallback(async (): Promise<number> => {
    try {
        // TODO: Query contract state via Blockfrost
        // For now, return 0 (will be implemented in Increment 2)
        return 0
    } catch (err) {
        setError('Failed to fetch vote count')
        console.error('Vote count query error:', err)
        return 0
    }
    }, [])

    return {
        submitVote,
        getVoteCount,
        hasUserVoted,
        isLoading,
        error,
        txHash,
    }
}