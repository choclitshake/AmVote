import { useState, useCallback } from 'react'
import { useWallet } from '@meshsdk/react'
import { MeshTxBuilder, BlockfrostProvider } from '@meshsdk/core'

// Contract address on Cardano Testnet (from P1)
const CONTRACT_ADDRESS = 'addr_test1wpg4cz6hz0c8q55z8pyejj35e7wx8schf4nmyxcr4ucq90c2jqfh9'

// Blockfrost API for testnet
const BLOCKFROST_KEY = 'previewSvKLVVyE5cMDW8FU9qJtNxyFtqF'

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

            const changeAddress = await wallet.getChangeAddress()
            console.log('Voter address:', changeAddress)

            const blockfrostProvider = new BlockfrostProvider(BLOCKFROST_KEY)

            const txBuilder = new MeshTxBuilder({
                fetcher: blockfrostProvider,
                submitter: blockfrostProvider,
            })

            // Add this to submitVote function before sending:
            const utxos = await wallet.getUtxos()
            console.log('Available UTxOs:', utxos)
            // If utxos are strings, you cannot access utxo.output directly.
            // Remove the balance calculation or parse UTxOs if needed.
            // For now, just log the count:
            console.log('Total UTxOs:', utxos.length)

            // Build transaction: Send 2 ADA to contract to vote
            const unsignedTx = await txBuilder
            .txOut(CONTRACT_ADDRESS, [{ unit: 'lovelace', quantity: '200000' }]) // 2 ADA
            .changeAddress(changeAddress)
            .complete()

            console.log('Transaction built:', unsignedTx)

            // Sign with wallet
            const signedTx = await wallet.signTx(unsignedTx, false)
            console.log('Transaction signed')       

            /// Submit to blockchain
            const submittedTxHash = await wallet.submitTx(signedTx)
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