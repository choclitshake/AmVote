import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Ballot } from '../components/Ballot';
import { VoteButton } from '../components/VoteButton';
import { useVoting } from '../hooks/useVoting';
import { useWallet } from '../hooks/useWallet';
import { useVoterStatus } from '../hooks/useVoterStatus';
import { useElection, formatCountdown } from '../hooks/useElection';
import { useElectionConfig } from '../hooks/useElectionConfig';
import { electionSettings } from '../data/electionData';
import { WalletConnect } from '../components/WalletConnect';

// ── Icons ────────────────────────────────────────────────
function ChevronRightIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>;
}
function CopyIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}
function CheckIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>;
}
function ExternalLinkIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
}

function formatDate(ts: number | string): string {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function Dashboard() {
  const { submitBallot, burnBallotToken, status, txHash, error, errorCode, isLoading } = useVoting();
  const { isConnected, address, networkId, disconnectWallet } = useWallet();
  const { voterStatus, isLoading: statusLoading, refresh: refreshStatus } = useVoterStatus();
  const { status: electionStatus, startTime, endTime, msUntilStart, msUntilEnd } = useElection();
  const { positions: configPositions, positionLabels, candidateNames } = useElectionConfig();
  const [lastSelections, setLastSelections] = useState<Record<string, string[]> | null>(() => {
    const saved = localStorage.getItem('AMVOTE_LAST_SELECTIONS');
    return saved ? JSON.parse(saved) : null;
  });
  const [txCopied, setTxCopied] = useState(false);
  const txRef = useRef<HTMLParagraphElement>(null);

  const positions = configPositions.map(p => ({
    id: p.id, title: p.name, maxChoices: p.maxSelections, candidates: p.candidates,
  }));

  const isVotePhaseDone = (status === 'confirmed' || (status.includes('burn-') && status !== 'burn-confirmed')) && !!txHash;
  const isBurnConfirmed = status === 'burn-confirmed';
  const isConfirmed = status === 'confirmed' && !!txHash;
  const registered = voterStatus?.registered ?? false;
  const hasVoted = voterStatus?.hasVoted ?? false;
  const checkingStatus = isConnected && statusLoading && !voterStatus;

  const endDate = endTime ? new Date(endTime) : new Date(electionSettings.deadlineEnd);
  const startLabel = startTime ? formatDate(startTime) : formatDate(electionSettings.deadlineStart);
  const endLabel = endTime ? formatDate(endTime) : formatDate(electionSettings.deadlineEnd);

  const electionBadge = electionStatus === 'Active'
    ? { label: 'Live', cls: 'badge-active', dot: 'bg-green-500 animate-pulse-slow' }
    : electionStatus === 'NotStarted'
      ? { label: 'Upcoming', cls: 'badge-pending', dot: 'bg-amber-400' }
      : { label: 'Closed', cls: 'badge-closed', dot: 'bg-red-500' };

  useEffect(() => {
    if (isConfirmed) refreshStatus();
  }, [isConfirmed, refreshStatus]);

  const handleSubmit = async (selections: Record<string, string[]>) => {
    setLastSelections(selections);
    localStorage.setItem('AMVOTE_LAST_SELECTIONS', JSON.stringify(selections));
    await submitBallot(selections, 'AMVOTE_2025_PH');
  };

  const handleBurn = async () => { await burnBallotToken(); };

  const copyTx = useCallback(async () => {
    if (!txHash) return;
    await navigator.clipboard.writeText(txHash).catch(() => {});
    setTxCopied(true);
    setTimeout(() => setTxCopied(false), 2000);
  }, [txHash]);

  const truncateAddr = (addr: string) =>
    addr.length > 20 ? `${addr.slice(0, 10)}…${addr.slice(-8)}` : addr;

  return (
    <div className="min-h-screen bg-bg-base">

      {/* ── Contextual top bar ─────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-bg-border bg-bg-base/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs font-body" aria-label="Progress">
            <Link to="/" className="text-text-muted hover:text-text-primary transition-colors font-heading font-bold">AmVote</Link>
            <ChevronRightIcon />
            <span className={`font-medium ${registered && !hasVoted ? 'text-amber-400' : 'text-text-muted'}`}>Register</span>
            {registered && (
              <>
                <ChevronRightIcon />
                <span className={`font-medium flex items-center gap-1 ${!hasVoted ? 'text-text-primary' : 'text-text-muted'}`}>
                  {hasVoted && <CheckIcon />} Vote
                </span>
              </>
            )}
          </nav>

          {/* Right: wallet info + disconnect */}
          <div className="flex items-center gap-3">
            {isConnected && address ? (
              <>
                <span className="hidden sm:flex items-center gap-1.5 text-xs font-body text-text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="font-mono">{truncateAddr(address)}</span>
                </span>
                <button
                  id="dashboard-disconnect"
                  onClick={disconnectWallet}
                  className="text-xs text-text-muted hover:text-red-400 font-body transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <WalletConnect compact />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Election Info Card ─────────────────────────────── */}
        <div className="glass-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-primary leading-tight">
                {electionSettings.title}
              </h1>
              <p className="text-sm text-text-secondary font-body mt-1">{electionSettings.description}</p>
              <p className="text-xs text-text-muted font-body mt-2">{startLabel} — {endLabel}</p>
              {electionStatus === 'NotStarted' && msUntilStart !== null && (
                <p className="text-xs font-mono text-amber-300 mt-2">
                  Opens in <span className="font-semibold">{formatCountdown(msUntilStart)}</span>
                </p>
              )}
              {electionStatus === 'Active' && msUntilEnd !== null && (
                <p className="text-xs font-mono text-green-400 mt-2">
                  Closes in <span className="font-semibold">{formatCountdown(msUntilEnd)}</span>
                </p>
              )}
              {electionStatus === 'Closed' && (
                <p className="text-xs font-mono text-red-400 mt-2">
                  Voting has ended ·{' '}
                  <Link to="/results" className="underline underline-offset-2 hover:text-red-300">view results →</Link>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <span className={`badge ${electionBadge.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${electionBadge.dot}`} />
                {electionBadge.label}
              </span>
              <span className="badge badge-muted font-mono">Cardano Preview</span>
            </div>
          </div>
        </div>

        {/* ── Voter Status Bar ───────────────────────────────── */}
        {!isConnected ? (
          <div className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div>
              <p className="text-sm font-heading font-semibold text-text-primary mb-1">Connect your wallet to vote</p>
              <p className="text-xs text-text-muted font-body">You need a Cardano wallet to participate in this election.</p>
            </div>
            <div className="sm:ml-auto shrink-0">
              <WalletConnect compact />
            </div>
          </div>
        ) : checkingStatus ? (
          <div className="rounded-xl border border-bg-border bg-bg-surface/50 px-5 py-3 flex items-center gap-3 text-sm text-text-secondary font-body">
            <span className="w-4 h-4 rounded-full border-2 border-text-muted border-t-transparent animate-spin" />
            Checking registration status…
          </div>
        ) : hasVoted ? (
          <div className="rounded-xl border border-green-500/25 bg-green-500/8 px-5 py-3 flex items-center gap-3 text-sm text-green-400 font-body">
            <CheckIcon size={16} />
            <span className="font-medium">You have already cast your vote.</span>
            <Link to="/results" className="ml-auto text-xs text-green-400/70 hover:text-green-300 underline underline-offset-2 shrink-0">View Results →</Link>
          </div>
        ) : registered ? (
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 px-5 py-3 flex items-center gap-3 text-sm text-amber-300 font-body">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 20h.01m7-10l3 3 4-5M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z" /></svg>
            <span className="font-medium">Registered and eligible to vote</span>
            {voterStatus?.voterId && <span className="ml-auto font-mono text-xs text-amber-400/60 shrink-0">{voterStatus.voterId}</span>}
          </div>
        ) : (
          <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-5 py-3 flex items-center gap-3 text-sm text-red-400 font-body">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            <span className="font-medium">Wallet not registered</span>
            <Link to="/register" id="dashboard-register-link" className="ml-auto text-xs text-red-400/70 hover:text-red-300 underline underline-offset-2 shrink-0">Register →</Link>
          </div>
        )}

        {/* ── Stats Row ──────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Your Status',
              value: !isConnected ? '—' : hasVoted ? 'Voted' : registered ? 'Eligible' : 'Unregistered',
              sub: voterStatus?.voterId ? `ID: ${voterStatus.voterId}` : 'registration status',
              accent: hasVoted ? 'text-green-400' : registered ? 'text-amber-400' : 'text-text-muted',
            },
            { label: 'Positions', value: positions.length, sub: 'offices to vote for', accent: 'text-violet-400' },
            {
              label: 'Deadline',
              value: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              sub: endDate.getFullYear().toString(),
              accent: 'text-text-primary',
            },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className={`text-xl font-heading font-bold ${s.accent}`}>{s.value}</p>
              <p className="text-xs font-body font-medium text-text-secondary mt-0.5">{s.label}</p>
              <p className="text-xs text-text-muted mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Wrong Network Warning ──────────────────────────── */}
        {isConnected && networkId !== null && networkId !== 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-400 font-body flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            Wrong network — please switch to Cardano Preview Testnet
          </div>
        )}

        {/* ── Error Banner ───────────────────────────────────── */}
        {error && !isVotePhaseDone && !isBurnConfirmed && (
          <VoteButton status={status} error={error} errorCode={errorCode} isLoading={false} />
        )}

        {/* ── Burn Confirmed Success ─────────────────────────── */}
        {isBurnConfirmed && txHash && (
          <div className="glass-card border border-green-500/25 bg-green-500/8 p-6 space-y-4 animate-scale-in shadow-green-glow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-heading font-bold text-green-400">Vote Successfully Finalized!</p>
                <p className="text-sm font-body text-text-secondary mt-1">
                  Your <span className="font-mono text-green-400">VOTE_2025_PH</span> token has been burned and your vote is permanently recorded on the Cardano blockchain.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-bg-border bg-bg-elevated p-3 flex items-center gap-3">
              <p ref={txRef} className="font-mono text-xs text-violet-300 break-all flex-1 min-w-0">{txHash}</p>
              <button
                id="dashboard-copy-tx"
                onClick={copyTx}
                className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-body font-semibold transition-all ${
                  txCopied
                    ? 'bg-green-500/15 border-green-500/30 text-green-400'
                    : 'bg-violet-500/15 border-violet-500/30 text-violet-300 hover:text-violet-200'
                }`}
              >
                {txCopied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy</>}
              </button>
              <a
                href={`${electionSettings.explorerBaseUrl}/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-border text-xs font-body text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <ExternalLinkIcon /> Explorer
              </a>
            </div>
            <div className="flex gap-3">
              <Link to="/results" id="dashboard-view-results" className="btn-primary flex-1 !py-2.5 !text-sm text-center justify-center">View Results</Link>
              <Link to="/verify" id="dashboard-verify-tx" className="btn-ghost flex-1 !py-2.5 !text-sm text-center justify-center">Verify Transaction</Link>
            </div>
          </div>
        )}

        {/* ── Ballot Form ────────────────────────────────────── */}
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

      {/* ── Mandatory Burn Modal ────────────────────────────── */}
      {isVotePhaseDone && lastSelections && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Finalize your vote">
          <div className="w-full max-w-lg animate-scale-in">
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