import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Ballot } from '../components/Ballot';
import { VoteCard } from '../components/VoteCard';
import { VoteButton } from '../components/VoteButton';
import { useVoting } from '../hooks/useVoting';
import { useWallet } from '../hooks/useWallet';
import { useVoterStatus } from '../hooks/useVoterStatus';
import { useElection, formatCountdown } from '../hooks/useElection';
import { useElectionConfig } from '../hooks/useElectionConfig';
import { electionSettings } from '../data/electionData';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function Dashboard() {
  const { submitBallot, burnBallotToken, status, txHash, error, errorCode, isLoading } = useVoting();
  const { isConnected, hasVoteToken, networkId } = useWallet();
  const { voterStatus, isLoading: statusLoading, refresh: refreshStatus } = useVoterStatus();
  const { status: electionStatus, startTime, endTime, msUntilStart, msUntilEnd } = useElection();
  const { positions: configPositions, positionLabels, candidateNames } = useElectionConfig();
  const positions = configPositions.map(p => ({
    id: p.id,
    title: p.name,
    maxChoices: p.maxSelections,
    candidates: p.candidates,
  }));
  const [lastSelections, setLastSelections] = useState<Record<string, string[]> | null>(() => {
    const saved = localStorage.getItem('AMVOTE_LAST_SELECTIONS');
    return saved ? JSON.parse(saved) : null;
  });

  // Show modal only while vote is confirmed but not yet burned
  const isVotePhaseDone = (status === 'confirmed' || (status.includes('burn-') && status !== 'burn-confirmed')) && !!txHash;
  const isBurnConfirmed = status === 'burn-confirmed';

  const isConfirmed = status === 'confirmed' && !!txHash;
  const registered = voterStatus?.registered ?? false;
  const hasVoted = voterStatus?.hasVoted ?? false;
  const checkingStatus = isConnected && statusLoading && !voterStatus;

  // Election status badge + schedule labels (DB schedule overrides the static defaults)
  const electionBadge =
    electionStatus === 'Active'
      ? { label: 'Active', cls: 'bg-green-500/15 text-green-500 border-green-500/30', dot: 'bg-green-500 animate-pulse' }
      : electionStatus === 'NotStarted'
        ? { label: 'Not started', cls: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30', dot: 'bg-yellow-400' }
        : electionStatus === 'Closed'
          ? { label: 'Closed', cls: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-500' }
          : { label: '…', cls: 'bg-bg-elevated text-text-muted border-bg-border', dot: 'bg-text-muted' };
  const endDate = endTime ? new Date(endTime) : new Date(electionSettings.deadlineEnd);
  const startLabel = startTime ? formatDate(new Date(startTime).toISOString()) : formatDate(electionSettings.deadlineStart);
  const endLabel = endTime ? formatDate(new Date(endTime).toISOString()) : formatDate(electionSettings.deadlineEnd);

  // After a vote confirms, the backend has flipped the voter to 'voted' — refresh status.
  useEffect(() => {
    if (isConfirmed) refreshStatus();
  }, [isConfirmed, refreshStatus]);

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
                {startLabel} — {endLabel}
              </p>
              {electionStatus === 'NotStarted' && msUntilStart !== null && (
                <p className="text-xs font-mono text-yellow-300 mt-2">⏳ Voting opens in {formatCountdown(msUntilStart)}</p>
              )}
              {electionStatus === 'Active' && msUntilEnd !== null && (
                <p className="text-xs font-mono text-green-400 mt-2">Voting closes in {formatCountdown(msUntilEnd)}</p>
              )}
              {electionStatus === 'Closed' && (
                <p className="text-xs font-mono text-red-400 mt-2">
                  Voting has ended · <Link to="/results" className="underline underline-offset-2">view results</Link>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-medium border ${electionBadge.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${electionBadge.dot}`} />
                {electionBadge.label}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30">
                Cardano Preview
              </span>
            </div>
          </div>
        </div>

        {/* ── Eligibility Status Bar ───────────────────────────── */}
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 text-sm font-body ${!isConnected || checkingStatus
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
          <VoteCard title="Deadline" value={endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} label={endDate.getFullYear().toString()} />
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
          disabled={
            isLoading || 
            !isConnected || 
            !registered || 
            hasVoted || 
            electionStatus !== 'Active' || 
            isBurnConfirmed || 
            (networkId !== null && networkId !== 0)
          }
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