import { useState, useEffect } from 'react'
import { useContract } from '../hooks/useContract'
import { useVoting } from '../hooks/useVoting'
import { useWallet } from '@meshsdk/react'
import type { VotingErrorCode } from '../hooks/useVoting'

interface VoteButtonProps {
    onVoteSuccess?: (txHash: string) => void
    onVoteError?: (error: string) => void
}

export function VoteButton({ onVoteSuccess, onVoteError }: VoteButtonProps) {
    const { connected } = useWallet()
    const { submitVote, isLoading, error, txHash, hasUserVoted } = useContract()
    const { status, errorCode } = useVoting()  // [T12] get status and errorCode
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

    // [T12] Status indicator — shows current transaction step
    const StatusIndicator = () => {
        const statusMap: Record<string, { label: string; color: string }> = {
            checking:   { label: '🔍 Checking eligibility...', color: 'text-blue-600' },
            building:   { label: '🔨 Building transaction...', color: 'text-blue-600' },
            signing:    { label: '✍️ Waiting for wallet signature...', color: 'text-yellow-600' },
            submitting: { label: '📡 Submitting to blockchain...', color: 'text-purple-600' },
            confirmed:  { label: '✅ Transaction confirmed!', color: 'text-green-600' },
        }
        const current = statusMap[status]
        if (!current) return null
        return <p className={`text-sm font-medium mt-3 ${current.color}`}>{current.label}</p>
    }

    // [T12] Error banner — shows friendly message + helpful hint per error code
    const ErrorBanner = () => {
        if (!error) return null

        const isWarning = errorCode === 'USER_CANCELLED'
        const hints: Partial<Record<VotingErrorCode, string>> = {
            WALLET_DISCONNECTED: 'Please connect your wallet using the button above.',
            WRONG_NETWORK:       'Switch to Preprod testnet in Eternl: Settings → Network.',
            MISSING_TOKEN:       'Contact the election admin to receive your VOTE_2025_PH token.',
            INSUFFICIENT_ADA:    'Get testnet ADA from: faucet.cardano-testnet.iohkdev.io',
            NO_COLLATERAL:       'In Eternl: Settings → Collateral → Set Collateral.',
            METADATA_TOO_LARGE:  'Try reducing the number of candidates selected.',
            TX_REJECTED:         'Please wait a moment and try submitting again.',
            USER_CANCELLED:      'You cancelled. Click Confirm Vote to try again.',
        }

        const hint = errorCode ? hints[errorCode] : null

        return (
            <div className={`mt-4 border-2 rounded-lg p-4 ${isWarning ? 'bg-yellow-50 border-yellow-400' : 'bg-red-50 border-red-500'}`}>
                <p className={`font-semibold text-sm ${isWarning ? 'text-yellow-700' : 'text-red-700'}`}>
                    {isWarning ? '⚠️' : '❌'} {error}
                </p>
                {hint && (
                    <p className={`text-xs mt-1 ${isWarning ? 'text-yellow-600' : 'text-red-600'}`}>
                        💡 {hint}
                    </p>
                )}
            </div>
        )
    }

    // Success state — original P3 code unchanged
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

    // Confirmation dialog — original P3 code + T12 additions
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

        {/* [T12] Status + Error banners */}
        <StatusIndicator />
        <ErrorBanner />
        </div>
    )
    }

    // User already voted — original P3 code unchanged
    if (userAlreadyVoted) {
    return (
        <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6 max-w-md">
        <h3 className="text-lg font-bold text-yellow-700 mb-2">✓ You Have Voted</h3>
        <p className="text-sm text-yellow-600">
            You have already voted in this election. Each wallet can only vote once.
        </p>
        </div>
    )
    }

    // Default: vote button — original P3 code + T12 additions
    return (
    <div>
        <button
        onClick={handleVoteClick}
        disabled={!connected || isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold px-8 py-4 rounded-lg hover:from-blue-700 hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg text-lg"
        >
        {!connected ? 'Connect Wallet to Vote' : isLoading ? '⏳ Submitting Vote...' : '🗳️ Cast Your Vote'}
        </button>

        {/* [T12] Status + Error banners */}
        <StatusIndicator />
        <ErrorBanner />
    </div>
    )
}
