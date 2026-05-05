import { useState, useEffect } from 'react'
import { Header } from '../components/Header'
import { WalletConnect } from '../components/WalletConnect'
import { VoteCard } from '../components/VoteCard'
import { VoteButton } from '../components/VoteButton'
import { useContract } from '../hooks/useContract'
import { useWallet } from '@meshsdk/react'

export function Dashboard() {
  const { connected } = useWallet()
  // const { getVoteCount, txHash, hasUserVoted } = useContract()
  const { getVoteCount } = useContract()
  const [voteCount, setVoteCount] = useState(0)
  const [isLoadingVotes, setIsLoadingVotes] = useState(false)
  const [userVoted, setUserVoted] = useState(false)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  // Fetch vote count
  useEffect(() => {
    const fetchVoteCount = async () => {
      setIsLoadingVotes(true)
      const count = await getVoteCount()
      setVoteCount(count)
      setIsLoadingVotes(false)
    }

    fetchVoteCount()
    const interval = setInterval(fetchVoteCount, 10000)
    return () => clearInterval(interval)
  }, [])
  // }, [getVoteCount])

  // Check if user voted
  // useEffect(() => {
  //   const checkVoteStatus = async () => {
  //     const voted = await hasUserVoted()
  //     setUserVoted(voted)
  //   }

  //   if (connected) {
  //     checkVoteStatus()
  //   }
  // }, [connected, hasUserVoted])

  // Update transaction hash
  // useEffect(() => {
  //   if (txHash) {
  //     setLastTxHash(txHash)
  //     setTimeout(async () => {
  //       const voted = await hasUserVoted()
  //       setUserVoted(voted)
  //     }, 3000)
  //   }
  // }, [txHash, hasUserVoted])

  const handleVoteSuccess = (txHash: string) => {
    console.log('Vote successful:', txHash)
    setLastTxHash(txHash)
    setUserVoted(true)
    setVoteCount(c => c + 1)
  }

  // const handleVoteSuccess = (txHash: string) => {
  //   console.log('Vote successful:', txHash)
  //   setTimeout(async () => {
  //     const count = await getVoteCount()
  //     setVoteCount(count)
  //   }, 5000)
  // }

  const handleVoteError = (error: string) => {
    console.error('Vote error:', error)
  }

  return (
    <div>
      {/* Wallet Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Wallet Connection</h2>
        <WalletConnect />
        {connected && <p className="text-sm text-green-600 mt-3">✓ Wallet connected and ready to vote</p>}
      </section>

      {/* Statistics */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Election Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <VoteCard
            title="Total Votes Cast"
            voteCount={isLoadingVotes ? -1 : voteCount}
          />
          <VoteCard
            title={userVoted ? '✓ You Voted' : 'Eligible to Vote'}
            voteCount={userVoted ? 1 : 0}
          />
          <VoteCard
            title="Blockchain Status"
            voteCount={connected ? 1 : 0}
          />
        </div>
      </section>

      {/* Voting Section */}
      <section className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Cast Your Vote</h2>

        <div className="max-w-md">
          {userVoted ? (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
              <p className="text-green-700 font-semibold text-lg">Vote Already Cast</p>
              <p className="text-green-600 text-sm mt-2">
                You have already voted in this election. Each wallet can only vote once.
              </p>
              {lastTxHash && (
                <a
                  href={`https://preview.cardanoscan.io/transaction/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 text-green-600 hover:text-green-800 font-semibold text-sm underline"
                >
                  View Your Vote on Blockchain →
                </a>
              )}
            </div>
          ) : (
            <VoteButton
              onVoteSuccess={handleVoteSuccess}
              onVoteError={handleVoteError}
            />
          )}
        </div>
      </section>

      {/* Transaction History */}
      {lastTxHash && (
        <section className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-blue-700 mb-3">Last Transaction</h3>
          <p className="text-xs font-mono text-gray-700 break-all bg-white p-3 rounded mb-3 border border-blue-200">
            {lastTxHash}
          </p>
          <a
            href={`https://preview.cardanoscan.io/transaction/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-semibold text-sm"
          >
            View on Cardano Scan →
          </a>
        </section>
      )}

      {/* Info */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3">About AmVote</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>✓ Each wallet can vote <strong>exactly once</strong></li>
          <li>✓ Votes recorded on <strong>Cardano blockchain</strong></li>
          <li>✓ Verify votes on <strong>Cardano Scan</strong></li>
          <li>✓ Running on <strong>Cardano Testnet</strong></li>
          <li>✓ <strong>Transparent and tamper-proof</strong></li>
        </ul>
      </section>
    </div>
  )
}