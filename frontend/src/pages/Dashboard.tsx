import { useState } from 'react';
import { WalletConnect } from '../components/WalletConnect';
import { Ballot } from '../components/Ballot';
import { VoteCard } from '../components/VoteCard';
import { useContract } from '../hooks/useContract';
import { electionData, electionSettings } from '../data/electionData';
import type { BallotChoices } from '../lib/metadataSchema';

// Build positions array from electionData
const positions = [
  {
    id: electionData.president.id,
    title: electionData.president.name,
    maxChoices: electionData.president.maxSelections,
    candidates: electionData.president.candidates.map(c => ({
      id: c.id, name: c.name, party: c.party, position: 'President'
    })),
  },
  {
    id: electionData.vice_president.id,
    title: electionData.vice_president.name,
    maxChoices: electionData.vice_president.maxSelections,
    candidates: electionData.vice_president.candidates.map(c => ({
      id: c.id, name: c.name, party: c.party, position: 'Vice President'
    })),
  },
  {
    id: electionData.senators.id,
    title: electionData.senators.name,
    maxChoices: electionData.senators.maxSelections,
    candidates: electionData.senators.candidates.map(c => ({
      id: c.id, name: c.name, party: c.party, position: 'Senator'
    })),
  },
];

export function Dashboard() {
  const { submitVote, isLoading, error, txHash } = useContract();
  const [voteStatus, setVoteStatus] = useState<
    'idle' | 'loading' | 'confirmed' | 'failed'
  >('idle');

  const handleSubmit = async (selections: Record<string, string[]>) => {
    setVoteStatus('loading');

    // Map generic selections → BallotChoices schema
    const ballot: BallotChoices = {
      p:  (selections['president']     ?? [])[0] ?? '',
      vp: (selections['vice_president'] ?? [])[0] ?? '',
      s:   selections['senators']       ?? [],
    };

    const hash = await submitVote(ballot);
    setVoteStatus(hash ? 'confirmed' : 'failed');
  };

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

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-red-700 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Success state */}
        {voteStatus === 'confirmed' && txHash && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
            <p className="font-semibold">✅ Your vote has been recorded on the Cardano blockchain!</p>
            <p className="text-xs font-mono mt-2 break-all bg-green-100 p-2 rounded">{txHash}</p>
            <a
              href={`${electionSettings.explorerBaseUrl}/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline font-semibold mt-2 block"
            >
              View on CardanoScan →
            </a>
          </div>
        )}

        {/* Ballot */}
        {voteStatus !== 'confirmed' && (
          <Ballot
            positions={positions}
            onSubmit={handleSubmit}
            disabled={isLoading || voteStatus === 'loading'}
          />
        )}
      </div>
    </div>
  );
}