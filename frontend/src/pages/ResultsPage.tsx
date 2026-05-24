import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
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

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Header row ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-heading font-bold text-text-primary">Live Results</h2>
            <p className="text-sm text-text-secondary font-body mt-1">
              Tallied directly from on-chain ballots (metadata label{' '}
              <span className="font-mono text-yellow-300">1337</span>) — anyone can recount from the public ledger.
            </p>
          </div>
          <button
            onClick={fetchResults}
            disabled={loading}
            className="px-4 py-2 rounded-xl font-heading font-semibold text-sm text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-violet-glow transition-all duration-200"
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>

        {/* ── Total counted ──────────────────────────────────────── */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-text-muted font-body">Total ballots counted</p>
            <p className="text-3xl font-heading font-bold text-yellow-400">
              {data ? data.totalVotes : loading ? '…' : 0}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30">
              {electionSettings.network === 'preview' ? 'Cardano Preview' : electionSettings.network}
            </span>
            {data?.lastUpdated && (
              <p className="text-xs text-text-muted font-body mt-2">
                Updated {new Date(data.lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────────────── */}
        {error && (
          <div className="bg-bg-surface border border-red-500/30 rounded-2xl p-4 text-sm text-red-400 font-body">
            {error}
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────── */}
        {!loading && data && data.totalVotes === 0 && !error && (
          <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 text-center">
            <p className="text-sm text-text-muted font-body">
              No ballots recorded on-chain yet. Cast a vote to see live results appear here.
            </p>
          </div>
        )}

        {/* ── Per-position results ───────────────────────────────── */}
        {positions.map(pos => {
          const tally = data?.tallies[pos.id] || {};
          const ranked = pos.candidates
            .map(c => ({ ...c, votes: tally[c.id] || 0 }))
            .sort((a, b) => b.votes - a.votes);
          const posTotal = ranked.reduce((sum, r) => sum + r.votes, 0);
          const maxVotes = Math.max(1, ...ranked.map(r => r.votes));

          return (
            <div key={pos.id} className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-heading font-semibold text-text-primary m-0">{pos.name}</h3>
                <span className="text-xs text-text-muted font-body">
                  {posTotal} vote{posTotal === 1 ? '' : 's'}
                  {pos.maxSelections > 1 ? ` · pick up to ${pos.maxSelections}` : ''}
                </span>
              </div>

              <div className="space-y-3">
                {ranked.map((c, i) => {
                  const pct = posTotal > 0 ? Math.round((c.votes / posTotal) * 100) : 0;
                  const barPct = (c.votes / maxVotes) * 100;
                  const leading = i === 0 && c.votes > 0;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-sm mb-1 gap-2">
                        <span className={`font-body truncate ${leading ? 'text-yellow-300 font-semibold' : 'text-text-primary'}`}>
                          {leading && '★ '}{c.name}
                          <span className="text-text-muted"> · {c.party}</span>
                        </span>
                        <span className="font-mono text-text-secondary shrink-0">
                          {c.votes} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${leading ? 'bg-yellow-400' : 'bg-violet-500'}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
