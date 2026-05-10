import { useState, useEffect } from 'react'
import { useContract } from '../hooks/useContract'
import { useVoting } from '../hooks/useVoting'
import { useWallet } from '@meshsdk/react'
import type { VotingErrorCode } from '../hooks/useVoting'

interface VoteButtonProps {
    onVoteSuccess?: (txHash: string) => void
    onVoteError?: (error: string) => void
}

type ButtonStatus =
    | 'idle'
    | 'loading'
    | 'pending'
    | 'confirmed'
    | 'failed'
    | 'already_voted'

export function VoteButton({
    onVoteSuccess,
    onVoteError,
}: VoteButtonProps) {
    const { connected } = useWallet()

    const {
        submitVote,
        isLoading,
        error,
        txHash,
        hasUserVoted,
    } = useContract()

    const { status, errorCode } = useVoting()

    const [showConfirmation, setShowConfirmation] = useState(false)
    const [voteSubmitted, setVoteSubmitted] = useState(false)
    const [userAlreadyVoted, setUserAlreadyVoted] = useState(false)

    // Check if user already voted
    useEffect(() => {
        const checkVoteStatus = async () => {
            const hasVoted = await hasUserVoted()
            setUserAlreadyVoted(hasVoted)
        }

        if (connected) {
            checkVoteStatus()
        }
    }, [connected, hasUserVoted])

    // Handle successful transaction
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
            alert(
                'You have already voted in this election. Each wallet can only vote once.'
            )
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

    // Unified button state
    const buttonStatus: ButtonStatus = (() => {
        if (userAlreadyVoted && !showConfirmation && !txHash) {
            return 'already_voted'
        }

        if (txHash || voteSubmitted) {
            return 'confirmed'
        }

        if (error) {
            return 'failed'
        }

        if (isLoading) {
            if (
                status === 'submitting' ||
                status === 'signing' ||
                status === 'building'
            ) {
                return 'pending'
            }

            return 'loading'
        }

        return 'idle'
    })()

    const statusConfig: Record<
        ButtonStatus,
        { label: string; color: string; disabled: boolean }
    > = {
        idle: {
            label: '🗳️ Cast Vote',
            color: 'bg-green-500 hover:bg-green-600',
            disabled: false,
        },
        loading: {
            label: 'Preparing...',
            color: 'bg-gray-400',
            disabled: true,
        },
        pending: {
            label: 'Submitting to Blockchain...',
            color: 'bg-yellow-500',
            disabled: true,
        },
        confirmed: {
            label: 'Vote Confirmed ✓',
            color: 'bg-green-600',
            disabled: true,
        },
        failed: {
            label: 'Transaction Failed',
            color: 'bg-red-500 hover:bg-red-600',
            disabled: false,
        },
        already_voted: {
            label: 'Already Voted',
            color: 'bg-gray-500',
            disabled: true,
        },
    }

    const config = statusConfig[buttonStatus]

    // Transaction status indicator
    const StatusIndicator = () => {
        const statusMap: Record<
            string,
            { label: string; color: string }
        > = {
            checking: {
                label: '🔍 Checking eligibility...',
                color: 'text-blue-600',
            },
            building: {
                label: '🔨 Building transaction...',
                color: 'text-blue-600',
            },
            signing: {
                label: '✍️ Waiting for wallet signature...',
                color: 'text-yellow-600',
            },
            submitting: {
                label: '📡 Submitting to blockchain...',
                color: 'text-purple-600',
            },
            confirmed: {
                label: '✅ Transaction confirmed!',
                color: 'text-green-600',
            },
        }

        const current = statusMap[status]

        if (!current) return null

        return (
            <p className={`text-sm font-medium mt-3 ${current.color}`}>
                {current.label}
            </p>
        )
    }

    // Error display
    const ErrorBanner = () => {
        if (!error) return null

        const isWarning = errorCode === 'USER_CANCELLED'

        const hints: Partial<Record<VotingErrorCode, string>> = {
            WALLET_DISCONNECTED:
                'Please connect your wallet using the button above.',
            WRONG_NETWORK:
                'Switch to Preprod testnet in Eternl: Settings → Network.',
            MISSING_TOKEN:
                'Contact the election admin to receive your VOTE_2025_PH token.',
            INSUFFICIENT_ADA:
                'Get testnet ADA from: faucet.cardano-testnet.iohkdev.io',
            NO_COLLATERAL:
                'In Eternl: Settings → Collateral → Set Collateral.',
            METADATA_TOO_LARGE:
                'Try reducing the number of candidates selected.',
            TX_REJECTED:
                'Please wait a moment and try submitting again.',
            USER_CANCELLED:
                'You cancelled. Click Confirm Vote to try again.',
        }

        const hint = errorCode ? hints[errorCode] : null

        return (
            <div
                className={`mt-4 border rounded-lg p-4 ${
                    isWarning
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-red-50 border-red-500'
                }`}
            >
                <p
                    className={`font-semibold text-sm ${
                        isWarning
                            ? 'text-yellow-700'
                            : 'text-red-700'
                    }`}
                >
                    {isWarning ? '⚠️' : '❌'} {error}
                </p>

                {hint && (
                    <p
                        className={`text-xs mt-1 ${
                            isWarning
                                ? 'text-yellow-600'
                                : 'text-red-600'
                        }`}
                    >
                        💡 {hint}
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-4 max-w-md">
            {/* Confirmation Dialog */}
            {showConfirmation && (
                <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-700 mb-4">
                        Confirm Your Vote
                    </h3>

                    <p className="text-sm text-gray-700 mb-6">
                        ⚠️{' '}
                        <span className="font-semibold">
                            Important:
                        </span>{' '}
                        You can only vote once. This action
                        will be permanently recorded on the
                        blockchain.
                    </p>

                    <div className="flex gap-4">
                        <button
                            onClick={handleConfirmVote}
                            disabled={isLoading}
                            className="flex-1 bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 disabled:opacity-50 transition font-semibold"
                        >
                            {isLoading
                                ? 'Submitting...'
                                : 'Confirm Vote'}
                        </button>

                        <button
                            onClick={handleCancelVote}
                            disabled={isLoading}
                            className="flex-1 bg-gray-400 text-white px-4 py-3 rounded hover:bg-gray-500 disabled:opacity-50 transition font-semibold"
                        >
                            Cancel
                        </button>
                    </div>

                    <StatusIndicator />
                    <ErrorBanner />
                </div>
            )}

            {/* Main Vote Button */}
            {!showConfirmation && (
                <>
                    <button
                        onClick={handleVoteClick}
                        disabled={
                            config.disabled || !connected
                        }
                        className={`w-full py-4 text-white font-semibold rounded-xl transition-all shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${config.color}`}
                    >
                        {buttonStatus === 'pending' && (
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        )}

                        {!connected
                            ? 'Connect Wallet to Vote'
                            : config.label}
                    </button>

                    {/* Pending Notice */}
                    {buttonStatus === 'pending' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                            ⏳ Transaction is being processed.
                            Please don't close this window.
                        </div>
                    )}

                    {/* Success State */}
                    {buttonStatus === 'confirmed' &&
                        txHash && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                                <p className="font-semibold mb-2">
                                    ✅ Vote recorded successfully!
                                </p>

                                <p className="break-all font-mono text-xs bg-green-100 p-2 rounded mb-3">
                                    {txHash}
                                </p>

                                <a
                                    href={`https://testnet.cardanoscan.io/transaction/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline font-semibold"
                                >
                                    View on CardanoScan →
                                </a>
                            </div>
                        )}

                    {/* Already Voted */}
                    {buttonStatus ===
                        'already_voted' && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                            🗳️ You have already cast your vote
                            in this election.
                        </div>
                    )}

                    <StatusIndicator />
                    <ErrorBanner />
                </>
            )}
        </div>
    )
}