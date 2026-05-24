import { useState } from 'react';
import { Header } from '../components/Header';
import { Ballot } from '../components/Ballot';
import { VoteCard } from '../components/VoteCard';
import { VoteButton } from '../components/VoteButton';
import { useVoting } from '../hooks/useVoting';
import { useWallet } from '../hooks/useWallet';
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
  const { submitBallot, burnBallotToken, status, txHash, error, errorCode, isLoading } = useVoting();
  const { isConnected, hasVoteToken, networkId } = useWallet();
  const [lastSelections, setLastSelections] = useState<Record<string, string[]> | null>(() => {
    const saved = localStorage.getItem('AMVOTE_LAST_SELECTIONS');
    return saved ? JSON.parse(saved) : null;
  });

  // Show modal only while vote is confirmed but not yet burned
  const isVotePhaseDone = (status === 'confirmed' || (status.includes('burn-') && status !== 'burn-confirmed')) && !!txHash;
  const isBurnConfirmed = status === 'burn-confirmed';

  const handleSubmit = async (selections: Record<string, string[]>) => {
    setLastSelections(selections);
    localStorage.setItem('AMVOTE_LAST_SELECTIONS', JSON.stringify(selections));
    await submitBallot(selections, 'AMVOTE_2025_PH');
  };

  const handleBurn = async () => {
    await burnBallotToken();
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
          !isConnected
            ? 'bg-bg-surface border-bg-border text-text-secondary'
            : hasVoteToken
              ? 'bg-yellow-400/5 border-yellow-400/30 text-yellow-300'
              : 'bg-red-500/5 border-red-500/30 text-red-400'
        }`}>
          {!isConnected ? (
            <>
              <span className="text-base">🔗</span>
              Connect your wallet to vote
            </>
          ) : hasVoteToken ? (
            <>
              <span className="text-base">🗳️</span>
              Eligible to vote — 1 VOTE_2025_PH token detected
            </>
          ) : (
            <>
              <span className="text-base">🚫</span>
              Not eligible — VOTE_2025_PH token not found in your wallet
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
          <VoteCard title="Token Status" value={hasVoteToken ? '1' : '0'} label="VOTE_2025_PH tokens" />
          <VoteCard title="Positions" value={positions.length} label="offices to vote for" />
          <VoteCard title="Deadline" value={new Date(electionSettings.deadlineEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} label={new Date(electionSettings.deadlineEnd).getFullYear().toString()} />
        </div>

        {/* ── Error Banner (Only show when not in modal) ── */}
        {error && !isVotePhaseDone && !isBurnConfirmed && (
          <VoteButton status={status} error={error} errorCode={errorCode} isLoading={false} />
        )}

        {/* ── Burn Confirmed Success Banner ─────────────────────── */}
        {isBurnConfirmed && txHash && (
          <div className="bg-green-500/10 border border-green-500/40 rounded-2xl p-6 space-y-4 shadow-[0_0_30px_rgba(34,197,94,0.08)]">
            <div className="flex items-start gap-4">
              <span className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-xl shrink-0">🎉</span>
              <div>
                <p className="text-lg font-heading font-bold text-green-400">Vote Fully Finalized!</p>
                <p className="text-sm font-body text-text-secondary mt-1">
                  Your <span className="font-mono text-green-400">VOTE_2025_PH</span> token has been burned and your vote is permanently recorded on the Cardano blockchain. Thank you for participating!
                </p>
              </div>
            </div>
            <div className="bg-bg-elevated rounded-xl border border-bg-border p-3 flex items-center gap-2">
              <p className="font-mono text-xs text-violet-300 break-all flex-1">{txHash}</p>
              <a
                href={`${electionSettings.explorerBaseUrl}/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:text-violet-200 text-xs font-body font-semibold transition-colors whitespace-nowrap"
              >
                View on CardanoScan ↗
              </a>
            </div>
          </div>
        )}

        {/* ── Ballot Form ──────────────────────────────────────── */}
        <Ballot
          positions={positions}
          onSubmit={handleSubmit}
          disabled={isLoading || !isConnected || !hasVoteToken || (networkId !== null && networkId !== 0) || isBurnConfirmed}
        />
      </main>

      {/* ── Mandatory Burn Modal Overlay ───────────────────────── */}
      {isVotePhaseDone && lastSelections && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <VoteButton
              status={status}
              error={error}
              errorCode={errorCode}
              isLoading={isLoading}
              onBurnToken={status === 'confirmed' ? handleBurn : undefined}
              receipt={{
                txHash: txHash!,
                electionId: 'AMVOTE_2025_PH',
                selections: lastSelections,
                positionLabels,
                candidateNames,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}