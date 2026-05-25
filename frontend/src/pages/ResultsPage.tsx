import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { electionSettings } from '../data/electionData';
import { useElectionConfig } from '../hooks/useElectionConfig';

const BACKEND_URL = 'http://localhost:3001';
const ELECTION_ID = 'AMVOTE_2025_PH';

interface ResultsResponse {
  electionId: string;
  totalVotes: number;
  tallies: Record<string, Record<string, number>>;
  lastUpdated: number;
}

function RefreshIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}
function ArrowLeftIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
}
function ExternalLinkIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
}

const rankStyles = [
  'bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-500 text-neutral-950 font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.4)] border border-yellow-300/30',
  'bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-neutral-950 font-extrabold shadow-[0_0_12px_rgba(226,232,240,0.3)] border border-slate-200/30',
  'bg-gradient-to-br from-orange-400 via-amber-700 to-amber-900 text-white font-extrabold shadow-[0_0_12px_rgba(180,83,9,0.3)] border border-orange-500/20',
];
const rankLabel = ['1st', '2nd', '3rd'];

export function ResultsPage() {
  const { positions } = useElectionConfig();
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/results/${ELECTION_ID}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load results');
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  return (
    <div className="min-h-screen bg-bg-base">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-bg-border bg-bg-base/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-body text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeftIcon /> AmVote
          </Link>
          <div className="flex items-center gap-2">
            <span className="badge badge-active">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-slow" />
              Live Tally
            </span>
            <span className="badge badge-muted font-mono">Cardano Preview</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Page header ───────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-heading font-bold text-text-primary">Voting Results</h1>
            <p className="text-sm text-text-secondary font-body mt-1 max-w-lg">
              Tallied directly from on-chain ballots (metadata label{' '}
              <span className="font-mono text-amber-300">1337</span>) — anyone can independently verify.
            </p>
          </div>
          <button
            id="results-refresh"
            onClick={fetchResults}
            disabled={loading}
            className="btn-ghost !py-2 !px-4 !text-sm shrink-0 flex items-center gap-2"
          >
            <span className={loading ? 'animate-spin' : ''}><RefreshIcon /></span>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Stats row ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Ballots', value: data ? data.totalVotes : loading ? '…' : '0', accent: 'text-amber-400' },
            { label: 'Positions', value: positions.length, accent: 'text-violet-400' },
            { label: 'Network', value: electionSettings.network === 'preview' ? 'Preview' : electionSettings.network, accent: 'text-text-primary' },
            { label: 'Last Updated', value: data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', accent: 'text-text-secondary' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className={`text-xl font-heading font-bold ${s.accent}`}>{s.value}</p>
              <p className="text-xs font-body text-text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Error ─────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-5 py-4 text-sm text-red-400 font-body">
            {error}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────── */}
        {!loading && data && data.totalVotes === 0 && !error && (
          <div className="glass-card p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            </div>
            <p className="text-sm font-body text-text-muted">
              No ballots have been cast yet. Results will appear here in real-time as votes are recorded.
            </p>
          </div>
        )}

        {/* ── Per-position results ──────────────────────────── */}
        {positions.map(pos => {
          const tally = data?.tallies[pos.id] || {};
          const ranked = pos.candidates
            .map(c => ({ ...c, votes: tally[c.id] || 0 }))
            .sort((a, b) => b.votes - a.votes);
          const posTotal = ranked.reduce((sum, r) => sum + r.votes, 0);
          const maxVotes = Math.max(1, ...ranked.map(r => r.votes));

          return (
            <div key={pos.id} className="glass-card p-5 sm:p-6 space-y-5">
              {/* Position header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-7 rounded-full bg-amber-gradient" aria-hidden="true" />
                  <div>
                    <h2 className="text-base font-heading font-bold text-text-primary">{pos.name}</h2>
                    <p className="text-xs text-text-muted font-body">
                      {posTotal} vote{posTotal !== 1 ? 's' : ''}{pos.maxSelections > 1 ? ` · pick up to ${pos.maxSelections}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Candidate rows */}
              <div className="space-y-3">
                {ranked.map((c, i) => {
                  const pct = posTotal > 0 ? Math.round((c.votes / posTotal) * 100) : 0;
                  const barPct = (c.votes / maxVotes) * 100;
                  const isLeading = i === 0 && c.votes > 0;

                  return (
                    <div key={c.id} className={`rounded-xl p-4 border transition-all duration-200 ${isLeading ? 'border-amber-400/20 bg-amber-400/5' : 'border-bg-border bg-bg-elevated/30'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        {/* Rank badge */}
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-heading font-bold shrink-0 ${i < 3 && c.votes > 0 ? rankStyles[i] : 'bg-bg-elevated text-text-muted border border-bg-border'}`}>
                          {i < 3 && c.votes > 0 ? rankLabel[i] : i + 1}
                        </div>
                        {/* Candidate info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-body font-semibold text-sm truncate ${isLeading ? 'text-amber-300' : 'text-text-primary'}`}>
                            {c.name}
                          </p>
                          <p className="text-xs text-text-muted font-body truncate">{c.party}{c.region ? ` · ${c.region}` : ''}</p>
                        </div>
                        {/* Vote count */}
                        <div className="text-right shrink-0">
                          <p className={`font-mono font-semibold text-sm ${isLeading ? 'text-amber-300' : 'text-text-secondary'}`}>{c.votes}</p>
                          <p className="text-xs text-text-muted font-mono">{pct}%</p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isLeading ? 'bg-amber-gradient' : 'bg-violet-gradient'}`}
                          style={{ width: `${barPct}%` }}
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── Footer navigation ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link to="/verify" id="results-verify-link" className="btn-ghost flex-1 justify-center">
            <ExternalLinkIcon /> Verify a Transaction
          </Link>
          <Link to="/" id="results-home-link" className="btn-ghost flex-1 justify-center">
            <ArrowLeftIcon /> Return Home
          </Link>
        </div>
      </main>
    </div>
  );
}
