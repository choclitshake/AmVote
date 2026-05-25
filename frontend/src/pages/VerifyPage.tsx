import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BlockfrostProvider } from '@meshsdk/core';
import { electionSettings } from '../data/electionData';
import { useElectionConfig } from '../hooks/useElectionConfig';

const BLOCKFROST_KEY = (import.meta as any).env?.VITE_BLOCKFROST_KEY as string ?? '';

interface TxResult {
  found: boolean;
  hash: string;
  status: string;
  block?: string;
  fees?: string;
  metadata?: Record<string, unknown> | null;
  error?: string;
}

// ── Icons ─────────────────────────────────────────────────
function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function ArrowLeftIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
}
function CopyIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}
function CheckIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>;
}
function ExternalLinkIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
}

export function VerifyPage() {
  const { positionLabels, candidateNames } = useElectionConfig();
  const [hash, setHash] = useState('');
  const [result, setResult] = useState<TxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);

  const handleLookup = async () => {
    const trimmed = hash.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);

    try {
      const provider = new BlockfrostProvider(BLOCKFROST_KEY);
      const txInfo = await provider.fetchTxInfo(trimmed);
      if (!txInfo) {
        setResult({ found: false, hash: trimmed, status: 'not_found' });
        setLoading(false);
        return;
      }

      let metadata: Record<string, unknown> | null = null;
      try {
        const raw = await provider.get(`txs/${trimmed}/metadata`);
        if (raw && Array.isArray(raw)) {
          metadata = {};
          raw.forEach((entry: { label: string; json_metadata: unknown }) => {
            if (entry.label && entry.json_metadata !== undefined) {
              (metadata as Record<string, unknown>)[entry.label] = entry.json_metadata;
            }
          });
        }
      } catch {}

      setResult({
        found: true, hash: trimmed, status: 'confirmed',
        block: (txInfo as any).block,
        fees: (txInfo as any).fees,
        metadata,
      });
    } catch (err) {
      setResult({
        found: false, hash: trimmed, status: 'error',
        error: err instanceof Error ? err.message : 'Failed to look up transaction',
      });
    } finally {
      setLoading(false);
    }
  };

  const ballotData = result?.metadata?.['1337'] as Record<string, unknown> | undefined;

  const copyHash = async () => {
    if (!result?.hash) return;
    await navigator.clipboard.writeText(result.hash).catch(() => {});
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-bg-base">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-bg-border bg-bg-base/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-body text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeftIcon /> AmVote
          </Link>
          <Link to="/results" className="text-sm font-body text-text-muted hover:text-text-primary transition-colors">
            View Results →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fade-up">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="text-center">
          <h1 className="text-3xl font-heading font-bold text-text-primary mb-2">Verify a Vote</h1>
          <p className="text-sm text-text-secondary font-body max-w-md mx-auto">
            Look up any Cardano transaction hash to confirm it contains an on-chain AmVote ballot.
          </p>
        </div>

        {/* ── Search ──────────────────────────────────────────── */}
        <div className="glass-card p-6 space-y-4">
          <label htmlFor="tx-hash-input" className="text-sm font-body font-medium text-text-secondary block">
            Transaction Hash
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <SearchIcon />
              </span>
              <input
                id="tx-hash-input"
                type="text"
                value={hash}
                onChange={e => setHash(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                placeholder="Paste a Cardano transaction hash…"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-bg-elevated border border-bg-border text-text-primary font-mono text-sm placeholder:text-text-muted focus:border-amber-400/50 focus:outline-none transition-all"
              />
            </div>
            <button
              id="verify-lookup-btn"
              onClick={handleLookup}
              disabled={loading || !hash.trim()}
              className="btn-primary !py-3 !px-6 shrink-0"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              ) : 'Look up'}
            </button>
          </div>
        </div>

        {/* ── Results ─────────────────────────────────────────── */}
        {result && (
          <div className="space-y-4 animate-fade-up">
            {result.found ? (
              <>
                {/* Transaction Confirmed card */}
                <div className="glass-card border border-green-500/20 p-6 space-y-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
                      <CheckIcon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-heading font-bold text-green-400">Transaction Confirmed</p>
                      <p className="text-xs text-text-muted font-body">On-chain · Cardano blockchain</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    {/* Hash row */}
                    <div className="flex items-start gap-3 bg-bg-elevated rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-muted font-body mb-1">Transaction Hash</p>
                        <p className="font-mono text-xs text-violet-300 break-all">{result.hash}</p>
                      </div>
                      <button
                        id="verify-copy-hash"
                        onClick={copyHash}
                        className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-xs font-body font-semibold transition-all ${hashCopied ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-bg-base border-bg-border text-text-muted hover:text-text-primary'}`}
                      >
                        {hashCopied ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>

                    {result.block && (
                      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-elevated rounded-xl">
                        <span className="text-xs text-text-muted font-body">Block</span>
                        <span className="font-mono text-sm text-text-primary">{result.block}</span>
                      </div>
                    )}
                    {result.fees && (
                      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-elevated rounded-xl">
                        <span className="text-xs text-text-muted font-body">Fees</span>
                        <span className="font-mono text-sm text-text-primary">{(parseInt(result.fees) / 1_000_000).toFixed(6)} ADA</span>
                      </div>
                    )}
                  </div>

                  <a
                    href={`${electionSettings.explorerBaseUrl}/${result.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-body text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <ExternalLinkIcon /> View on CardanoScan
                  </a>
                </div>

                {/* Ballot metadata card */}
                {ballotData ? (
                  <div className="glass-card border border-amber-400/20 p-6 space-y-5">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-pending font-mono">1337</span>
                      <p className="text-sm font-heading font-bold text-text-primary">AmVote Ballot Found</p>
                      <div className="ml-auto">
                        <span className="badge badge-active"><CheckIcon size={10} /> Verified</span>
                      </div>
                    </div>

                    {(ballotData as any).electionId && (
                      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-elevated rounded-xl">
                        <span className="text-xs text-text-muted font-body">Election ID</span>
                        <span className="font-mono text-sm text-amber-300">{(ballotData as any).electionId}</span>
                      </div>
                    )}

                    {(ballotData as any).ballot && (
                      <div>
                        <p className="text-xs text-text-muted font-body mb-3">Ballot Choices</p>
                        <div className="space-y-3">
                          {Object.entries((ballotData as any).ballot).map(([posId, choices]) => {
                            const posName = positionLabels[posId] || posId;
                            const candArray = Array.isArray(choices) ? choices : [choices];
                            const candNames = candArray.map((c: string) => candidateNames[c] || c);
                            return (
                              <div key={posId} className="bg-bg-elevated rounded-xl px-4 py-3">
                                <p className="text-xs font-body font-semibold text-amber-300 mb-2">{posName}</p>
                                <ul className="space-y-1">
                                  {candNames.map((name: string, i: number) => (
                                    <li key={i} className="flex items-center gap-2 text-sm font-body text-text-primary">
                                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                                      {name}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(ballotData as any).timestamp && (
                      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-elevated rounded-xl">
                        <span className="text-xs text-text-muted font-body">Timestamp</span>
                        <span className="font-mono text-xs text-text-secondary">
                          {new Date((ballotData as any).timestamp).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-card p-5">
                    <p className="text-sm text-text-muted font-body">No AmVote ballot (label 1337) found for this transaction.</p>
                  </div>
                )}
              </>
            ) : (
              /* Error state */
              <div className="glass-card border border-red-500/25 p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/12 border border-red-500/25 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                </div>
                <div>
                  <p className="text-sm font-heading font-bold text-red-400 mb-1">Transaction Not Found</p>
                  <p className="text-sm text-red-400/70 font-body">
                    {result.error || 'Check the hash and try again. The transaction may still be pending.'}
                  </p>
                  <button
                    id="verify-try-again"
                    onClick={() => { setResult(null); setHash(''); }}
                    className="mt-3 text-xs font-body text-text-muted hover:text-text-primary underline underline-offset-2 transition-colors"
                  >
                    Try another hash
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                id="verify-another"
                onClick={() => { setResult(null); setHash(''); }}
                className="btn-ghost flex-1"
              >
                Verify Another
              </button>
              <Link to="/results" id="verify-results-link" className="btn-ghost flex-1 text-center justify-center">
                Back to Results
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
