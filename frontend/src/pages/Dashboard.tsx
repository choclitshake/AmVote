// frontend/src/pages/Dashboard.tsx

import { useVoting } from '../hooks/useVoting';
import { useWallet } from '@meshsdk/react';
import { WalletConnect } from '../components/WalletConnect';
import { Ballot } from '../components/Ballot';
import { VoteCard } from '../components/VoteCard';
import { electionData, electionSettings } from '../data/electionData';
import type { BallotChoices } from '../lib/metadataSchema';

// Convert electionData into the shape Ballot.tsx expects
const positions = [
  {
    id: electionData.president.id,
    title: electionData.president.name,
    maxChoices: electionData.president.maxSelections,
    candidates: electionData.president.candidates.map(c => ({
      id: c.id,
      name: c.name,
      party: c.party,
      position: electionData.president.name,
    })),
  },
  {
    id: electionData.vice_president.id,
    title: electionData.vice_president.name,
    maxChoices: electionData.vice_president.maxSelections,
    candidates: electionData.vice_president.candidates.map(c => ({
      id: c.id,
      name: c.name,
      party: c.party,
      position: electionData.vice_president.name,
    })),
  },
  {
    id: electionData.senators.id,
    title: electionData.senators.name,
    maxChoices: electionData.senators.maxSelections,
    candidates: electionData.senators.candidates.map(c => ({
      id: c.id,
      name: c.name,
      party: c.party,
      position: electionData.senators.name,
    })),
  },
];

export function Dashboard() {
  const { connected } = useWallet();
  const {
    submitBallot,
    status,
    txHash,
    error,
    errorCode,
    isLoading,
  } = useVoting();

  const handleSubmit = async (selections: Record<string, string[]>) => {
    // selections from Ballot.tsx is already Record<positionId, candidateId[]>
    // which matches our updated BallotChoices type
    const ballot: BallotChoices = selections;
    await submitBallot(ballot, 'AMVOTE_2025_PH');
  };

  const isConfirmed = status === 'confirmed' && txHash;
  const isPending = ['checking', 'building', 'signing', 'submitting'].includes(status);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">AmVote</h1>
            <p className="text-gray-500 text-sm">Transparent Voting on Cardano</p>
          </div>
          <WalletConnect />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Election Info */}
        <div className="bg-white rounded-xl shadow p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{electionSettings.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{electionSettings.description}</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
            Active
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <VoteCard title="Total Votes Cast" voteCount={0} />
          <VoteCard title="Active Voters" voteCount={0} />
          <VoteCard title="Positions" voteCount={positions.length} />
        </div>

        {/* Wallet warning */}
        {!connected && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800 text-sm">
            ⚠️ Connect your wallet above to cast your vote.
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-red-800 text-sm">
            <p className="font-semibold">❌ {error}</p>
            {errorCode === 'MISSING_TOKEN' && (
              <p className="mt-1 text-xs">Contact the election admin to receive your VOTE_2025_PH token.</p>
            )}
            {errorCode === 'NO_COLLATERAL' && (
              <p className="mt-1 text-xs">In Eternl: Settings → Collateral → Set Collateral.</p>
            )}
            {errorCode === 'WRONG_NETWORK' && (
              <p className="mt-1 text-xs">Switch to Preprod testnet in your wallet settings.</p>
            )}
          </div>
        )}

        {/* Success receipt — T13 */}
        {isConfirmed && txHash && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-6 text-green-800 space-y-3">
            <p className="text-lg font-bold">✅ Vote recorded on the blockchain!</p>
            <div>
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Transaction Hash</p>
              <p className="font-mono text-xs bg-green-100 rounded p-2 break-all">{txHash}</p>
            </div>
            <a
              href={`${electionSettings.explorerBaseUrl}/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-semibold underline"
            >
              View on CardanoScan →
            </a>
          </div>
        )}

        {/* Ballot */}
        {!isConfirmed && (
          <Ballot
            positions={positions}
            onSubmit={handleSubmit}
            disabled={isPending || !connected || isLoading}
          />
        )}
      </div>
    </div>
  );
}