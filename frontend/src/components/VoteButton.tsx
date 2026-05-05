import { useState, useEffect } from 'react'
import { useContract } from '../hooks/useContract'
import { useWallet } from '@meshsdk/react'

interface VoteButtonProps {
    onVoteSuccess?: (txHash: string) => void
    onVoteError?: (error: string) => void
}

export function VoteButton({ onVoteSuccess, onVoteError }: VoteButtonProps) {
    const { connected } = useWallet()
    const { submitVote, isLoading, error, txHash, hasUserVoted, previousTxHash } = useContract()
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [voteSubmitted, setVoteSubmitted] = useState(false)
    const [userAlreadyVoted, setUserAlreadyVoted] = useState(false)

    // Check if user has already voted
    useEffect(() => {
    const checkVoteStatus = async () => {
        const hasVoted = await hasUserVoted()
        setUserAlreadyVoted(hasVoted)
    }
    if (connected) {
        checkVoteStatus()
    }
    }, [connected, hasUserVoted])

    // Handle successful vote
    useEffect(() => {
    if (txHash) {
        setVoteSubmitted(true)
        setShowConfirmation(false)
        setUserAlreadyVoted(true)
        onVoteSuccess?.(txHash)
    }
    }, [txHash, onVoteSuccess])

    // Handle errors
    useEffect(() => {
    if (error) {
        onVoteError?.(error)
    }
    }, [error, onVoteError])

    const handleVoteClick = () => {
    if (!connected) {
        alert('Please connect your wallet first')
        return
    }

    if (userAlreadyVoted) {
        alert('You have already voted in this election. Each wallet can only vote once.')
        return
    }

    setShowConfirmation(true)
    }

    const handleConfirmVote = async () => {
        await submitVote()
    }

    const handleCancelVote = () => {
        setShowConfirmation(false)
    }

    // Success state
    if (voteSubmitted && txHash) {
    return (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 max-w-md">
        <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl">✓</span>
            <h3 className="text-xl font-bold text-green-700">Vote Submitted!</h3>
        </div>

        <p className="text-sm text-green-600 mb-2 font-semibold">Transaction Hash:</p>
        <p className="text-xs font-mono text-gray-700 break-all bg-green-100 p-3 rounded mb-4">
            {txHash}
        </p>

        <p className="text-sm text-gray-700 mb-4">
            Your vote has been recorded on the Cardano blockchain and cannot be changed.
        </p>

        
        <a
            href={`https://testnet.cardanoscan.io/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-semibold text-sm"
        >
            View on Cardano Scan →
        </a>
        </div>
    )
    }

    // Confirmation dialog
    if (showConfirmation) {
    return (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 max-w-md">
        <h3 className="text-lg font-bold text-blue-700 mb-4">Confirm Your Vote</h3>

        <p className="text-sm text-gray-700 mb-6">
            ⚠️ <span className="font-semibold">Important:</span> You can only vote once. This action will be recorded on the blockchain permanently.
        </p>

        <div className="flex gap-4">
            <button
            onClick={handleConfirmVote}
            disabled={isLoading}
            className="flex-1 bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 disabled:opacity-50 transition font-semibold"
            >
            {isLoading ? 'Submitting...' : 'Confirm Vote'}
            </button>

            <button
            onClick={handleCancelVote}
            disabled={isLoading}
            className="flex-1 bg-gray-400 text-white px-4 py-3 rounded hover:bg-gray-500 disabled:opacity-50 transition font-semibold"
            >
            Cancel
            </button>
        </div>

        {error && (
            <div className="mt-4 bg-red-50 border border-red-300 rounded p-3">
            <p className="text-red-700 text-sm">{error}</p>
            </div>
        )}
        </div>
    )
    }

    // User already voted
    if (userAlreadyVoted) {
        return (
            <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6 max-w-md">
                <h3 className="text-lg font-bold text-yellow-700 mb-2">✓ You Have Already Voted</h3>
                <p className="text-sm text-yellow-600 mb-4">
                    Each wallet can only vote once. Your vote is permanently recorded on the blockchain.
                </p>
                {previousTxHash && (
                    <div>
                        <p className="text-xs text-yellow-700 font-semibold mb-1">Your transaction:</p>
                        <p className="text-xs font-mono text-gray-700 break-all bg-yellow-100 p-2 rounded mb-3">
                            {previousTxHash}
                        </p>
                        <a
                            href={`https://preview.cardanoscan.io/transaction/${previousTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition font-semibold text-sm"
                        >
                            View on Cardano Scan →
                        </a>
                    </div>
                )}
            </div>
        )
    }

    // Default: vote button
    return (
    <div>
        <button
        onClick={handleVoteClick}
        disabled={!connected || isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold px-8 py-4 rounded-lg hover:from-blue-700 hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg text-lg"
        >
        {!connected ? 'Connect Wallet to Vote' : isLoading ? '⏳ Submitting Vote...' : '🗳️ Cast Your Vote'}
        </button>

        {error && (
        <div className="mt-4 bg-red-50 border-2 border-red-500 rounded-lg p-4">
            <p className="text-red-700 font-semibold text-sm">❌ Error:</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
        )}
    </div>
    )
}