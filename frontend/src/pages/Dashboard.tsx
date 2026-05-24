import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Ballot } from '../components/Ballot';
import { VoteCard } from '../components/VoteCard';
import { VoteButton } from '../components/VoteButton';
import { useVoting } from '../hooks/useVoting';
import { useWallet } from '../hooks/useWallet';
import { useVoterStatus } from '../hooks/useVoterStatus';
import { electionData, electionSettings } from '../data/electionData';

// ── Build positions array from electionData ───────────────────────────────────
const positions = [
  {
    id: electionData.president.id,
    title: electionData.president.name,
    maxChoices: electionData.president.maxSelections,
    candidates: electionData.president.candidates.map(c => ({
      id: c.id, name: c.name, party: c.party, region: c.region,
    })),
  },
  {
    id: electionData.vice_president.id,
    title: electionData.vice_president.name,
    maxChoices: electionData.vice_president.maxSelections,
    candidates: electionData.vice_president.candidates.map(c => ({
      id: c.id, name: c.name, party: c.party, region: c.region,
    })),
  },
  {
    id: electionData.senators.id,
    title: electionData.senators.name,
    maxChoices: electionData.senators.maxSelections,
    candidates: electionData.senators.candidates.map(c => ({
      id: c.id, name: c.name, party: c.party, region: c.region,
    })),
  },
];

// ── Lookup maps for receipt display ───────────────────────────────────────────
const positionLabels: Record<string, string> = {};
const candidateNames: Record<string, string> = {};
positions.forEach(p => {
  positionLabels[p.id] = p.title;
  p.candidates.forEach(c => {
    candidateNames[c.id] = c.name;
  });
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function Dashboard() {
  const { submitBallot, status, txHash, error, errorCode, isLoading } = useVoting();
  const { isConnected, networkId } = useWallet();
  const { voterStatus, isLoading: statusLoading, refresh: refreshStatus } = useVoterStatus();
  const [lastSelections, setLastSelections] = useState<Record<string, string[]> | null>(() => {
    const saved = localStorage.getItem('AMVOTE_LAST_SELECTIONS');
    return saved ? JSON.parse(saved) : null;
  });

  const isConfirmed = status === 'confirmed' && !!txHash;
  const registered = voterStatus?.registered ?? false;
  const hasVoted = voterStatus?.hasVoted ?? false;
  const checkingStatus = isConnected && statusLoading && !voterStatus;

  // After a vote confirms, the backend has flipped the voter to 'voted' — refresh status.
  useEffect(() => {
    if (isConfirmed) refreshStatus();
  }, [isConfirmed, refreshStatus]);

  const handleSubmit = async (selections: Record<string, string[]>) => {
    setLastSelections(selections);
    localStorage.setItem('AMVOTE_LAST_SELECTIONS', JSON.stringify(selections));
    await submitBallot(selections, 'AMVOTE_2025_PH');
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Election Info Banner ──────────────────────────────── */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary m-0">
                {electionSettings.title}
              </h2>
              <p className="text-sm text-text-secondary font-body mt-1">
                {electionSettings.description}
              </p>
              <p className="text-xs text-text-muted font-body mt-2">
                {formatDate(electionSettings.deadlineStart)} — {formatDate(electionSettings.deadlineEnd)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-medium bg-green-500/15 text-green-500 border border-green-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Active
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30">
                Cardano Preview
              </span>
            </div>
          </div>
        </div>

        {/* ── Eligibility Status Bar ───────────────────────────── */}
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 text-sm font-body ${
          !isConnected || checkingStatus
            ? 'bg-bg-surface border-bg-border text-text-secondary'
            : hasVoted
              ? 'bg-green-500/5 border-green-500/30 text-green-400'
              : registered
                ? 'bg-yellow-400/5 border-yellow-400/30 text-yellow-300'
                : 'bg-red-500/5 border-red-500/30 text-red-400'
        }`}>
          {!isConnected ? (
            <>
              <span className="text-base">🔗</span>
              Connect your wallet to vote
            </>
          ) : checkingStatus ? (
            <>
              <span className="text-base">⏳</span>
              Checking your registration…
            </>
          ) : hasVoted ? (
            <>
              <span className="text-base">✅</span>
              You have already cast your vote
            </>
          ) : registered ? (
            <>
              <span className="text-base">🗳️</span>
              Registered and eligible to vote{voterStatus?.voterId ? ` — ${voterStatus.voterId}` : ''}
            </>
          ) : (
            <>
              <span className="text-base">🚫</span>
              Wallet not registered —{' '}
              <Link to="/register" className="underline underline-offset-2 font-medium hover:text-red-300">
                register to vote first
              </Link>
            </>
          )}
          {isConnected && networkId !== null && networkId !== 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400 border border-red-500/30">
              ⚠ Wrong Network
            </span>
          )}
        </div>

        {/* ── Stats Row ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <VoteCard
            title="Voter Status"
            value={!isConnected ? '—' : hasVoted ? 'Voted' : registered ? 'Eligible' : 'Unregistered'}
            label={voterStatus?.voterId ? `Voter ID: ${voterStatus.voterId}` : 'registration status'}
          />
          <VoteCard title="Positions" value={positions.length} label="offices to vote for" />
          <VoteCard title="Deadline" value={new Date(electionSettings.deadlineEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} label={new Date(electionSettings.deadlineEnd).getFullYear().toString()} />
        </div>

        {/* ── Error Banner ─────────────────────────────────────── */}
        {error && !isConfirmed && (
          <VoteButton status={status} error={error} errorCode={errorCode} isLoading={false} />
        )}

        {/* ── Receipt OR Ballot ────────────────────────────────── */}
        {isConfirmed && lastSelections ? (
          <VoteButton
            receipt={{
              txHash: txHash!,
              electionId: 'AMVOTE_2025_PH',
              selections: lastSelections,
              positionLabels,
              candidateNames,
            }}
          />
        ) : (
          <>
            {(isLoading && !error) && (
              <VoteButton status={status} isLoading={isLoading} />
            )}
            <Ballot
              positions={positions}
              onSubmit={handleSubmit}
              disabled={isLoading || !isConnected || !registered || hasVoted}
            />
          </>
        )}
      </main>
    </div>
  );
}