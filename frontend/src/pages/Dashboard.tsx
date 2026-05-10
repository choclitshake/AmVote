import { useState } from 'react';
import { WalletConnect } from '../components/WalletConnect';
import { Ballot } from '../components/Ballot';
import { VoteCard } from '../components/VoteCard';

const MOCK_ELECTION = {
  title: '2025 Barangay Elections',
  status: 'Active',
  positions: [
    {
      id: 'president',
      title: 'President',
      maxChoices: 1,
      candidates: [
        { id: 'p1', name: 'Juan dela Cruz', party: 'Partido ng Bayan', position: 'President' },
        { id: 'p2', name: 'Maria Santos', party: 'Lakas ng Masa', position: 'President' },
      ],
    },
    {
      id: 'vp',
      title: 'Vice President',
      maxChoices: 1,
      candidates: [
        { id: 'vp1', name: 'Pedro Reyes', party: 'Partido ng Bayan', position: 'Vice President' },
        { id: 'vp2', name: 'Ana Lim', party: 'Lakas ng Masa', position: 'Vice President' },
      ],
    },
    {
      id: 'senators',
      title: 'Senators',
      maxChoices: 3,
      candidates: [
        { id: 's1', name: 'Jose Rizal Jr.', party: 'Partido ng Bayan', position: 'Senator' },
        { id: 's2', name: 'Andres B.', party: 'Lakas ng Masa', position: 'Senator' },
        { id: 's3', name: 'Emilio A.', party: 'Independent', position: 'Senator' },
        { id: 's4', name: 'Gabriela S.', party: 'Partido ng Bayan', position: 'Senator' },
      ],
    },
  ],
};

export function Dashboard() {
  const [voteStatus, setVoteStatus] = useState<'idle' | 'loading' | 'pending' | 'confirmed' | 'failed' | 'already_voted'>('idle');
  const [txHash, setTxHash] = useState('');

  const handleSubmit = async (selections: Record<string, string[]>) => {
    setVoteStatus('pending');
    setTimeout(() => {
      setVoteStatus('confirmed');
      setTxHash('mock_tx_hash_abc123');
    }, 2000);
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
            <h2 className="text-xl font-bold text-gray-800">{MOCK_ELECTION.title}</h2>
            <p className="text-sm text-gray-500 mt-1">Cast your vote securely on the blockchain</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
            {MOCK_ELECTION.status}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <VoteCard title="Total Votes Cast" voteCount={0} />
          <VoteCard title="Active Voters" voteCount={0} />
          <VoteCard title="Positions" voteCount={MOCK_ELECTION.positions.length} />
        </div>

        {/* Vote status banner */}
        {voteStatus === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
            ✅ Your vote has been recorded on the Cardano blockchain!
              {txHash && (
                            <p className="block mt-1 text-sm underline">
                              View transaction: {txHash}
                            </p>
                          )}
                        </div>
                      )}

        {/* Ballot */}
        {voteStatus !== 'confirmed' && (
          <Ballot
            positions={MOCK_ELECTION.positions}
            onSubmit={handleSubmit}
            disabled={voteStatus === 'pending'}
          />
        )}
      </div>
    </div>
  );
}