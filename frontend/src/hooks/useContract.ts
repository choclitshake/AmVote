/// <reference types="vite/client" />
import { useState, useCallback, useEffect } from 'react'
import { useWallet } from '@meshsdk/react'
import { MeshTxBuilder, BlockfrostProvider } from '@meshsdk/core'
import * as CBOR from 'cbor-js'
import { bech32 } from 'bech32'

const CONTRACT_ADDRESS = 'addr_test1wpg4cz6hz0c8q55z8pyejj35e7wx8schf4nmyxcr4ucq90c2jqfh9'
const BLOCKFROST_KEY = import.meta.env.VITE_BLOCKFROST_KEY as string
const VOTE_STORAGE_KEY = 'amvote_txhash'

interface UseContractReturn {
    submitVote: () => Promise<string | null>
    getVoteCount: () => Promise<number>
    hasUserVoted: () => Promise<boolean>
    getPreviousVoteTxHash: () => string | null
    isLoading: boolean
    error: string | null
    txHash: string | null
    previousTxHash: string | null
}

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
    if (trailerIdx === -1) {
        throw new Error('Cannot find trailer in unsigned tx')
    }
    const txBodyHex = unsignedTxHex.slice(2, trailerIdx)
    return '84' + txBodyHex + witnessHex + 'f5' + 'd90103a0'
}

function getStorageKey(walletAddress: string): string {
    return `${VOTE_STORAGE_KEY}_${walletAddress}`
}

function saveVoteTxHash(walletAddress: string, txHash: string): void {
    localStorage.setItem(getStorageKey(walletAddress), txHash)
}

function loadVoteTxHash(walletAddress: string): string | null {
    return localStorage.getItem(getStorageKey(walletAddress))
}

export function useContract(): UseContractReturn {
    const { wallet, connected } = useWallet()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [previousTxHash, setPreviousTxHash] = useState<string | null>(null)
    const [walletAddress, setWalletAddress] = useState<string | null>(null)

    // Resolve wallet address and check for previous vote on connect
    useEffect(() => {
        if (!connected || !wallet) {
            setWalletAddress(null)
            setPreviousTxHash(null)
            return
        }

        const init = async () => {
            try {
                const rawAddr = await wallet.getChangeAddress()
                const addr = rawAddr.startsWith('addr')
                    ? rawAddr
                    : hexAddressToBech32(rawAddr)
                setWalletAddress(addr)

                const stored = loadVoteTxHash(addr)
                if (stored) {
                    setPreviousTxHash(stored)
                }
            } catch (err) {
                console.error('Error initializing wallet address:', err)
            }
        }

        init()
    }, [connected, wallet])

    const getPreviousVoteTxHash = useCallback((): string | null => {
        return previousTxHash
    }, [previousTxHash])

    const hasUserVoted = useCallback(async (): Promise<boolean> => {
        try {
            if (!wallet || !walletAddress) return false
            const stored = loadVoteTxHash(walletAddress)
            return stored !== null
        } catch (err) {
            console.error('Error checking vote status:', err)
            return false
        }
    }, [wallet, walletAddress])

    const submitVote = useCallback(async (): Promise<string | null> => {
        if (!connected || !wallet) {
            setError('Wallet not connected')
            return null
        }

        // Block if already voted
        if (walletAddress && loadVoteTxHash(walletAddress)) {
            setError('You have already voted with this wallet.')
            return null
        }

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
            const fullSignedTx = assembleTransaction(unsignedTx, signedWitnesses)
            const submittedTxHash = await blockfrostProvider.submitTx(fullSignedTx)

            // Persist vote to localStorage
            if (walletAddress) {
                saveVoteTxHash(walletAddress, submittedTxHash)
                setPreviousTxHash(submittedTxHash)
            }

            setTxHash(submittedTxHash)
            return submittedTxHash
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setError(`Vote submission failed: ${errorMessage}`)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [connected, wallet, walletAddress])

    const getVoteCount = useCallback(async (): Promise<number> => {
        try {
            // TODO: Query contract state via Blockfrost (Increment 2)
            return 0
        } catch (err) {
            console.error('Vote count query error:', err)
            return 0
        }
    }, [])

    return {
        submitVote,
        getVoteCount,
        hasUserVoted,
        getPreviousVoteTxHash,
        isLoading,
        error,
        txHash,
        previousTxHash,
    }
}