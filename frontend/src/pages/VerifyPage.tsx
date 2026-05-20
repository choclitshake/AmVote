import { useState } from 'react';
import { BlockfrostProvider } from '@meshsdk/core';
import { Header } from '../components/Header';
import { electionSettings } from '../data/electionData';

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

export function VerifyPage() {
  const [hash, setHash] = useState('');
  const [result, setResult] = useState<TxResult | null>(null);
  const [loading, setLoading] = useState(false);

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

      // Try to get metadata
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
      } catch (e) {
        console.error('Metadata fetch failed:', e);
      }

      setResult({
        found: true,
        hash: trimmed,
        status: 'confirmed',
        block: (txInfo as any).block,
        fees: (txInfo as any).fees,
        metadata,
      });
    } catch (err) {
      setResult({
        found: false,
        hash: trimmed,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to look up transaction',
      });
    } finally {
      setLoading(false);
    }
  };

  const ballotData = result?.metadata?.['1337'] as Record<string, unknown> | undefined;

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary">Verify a Vote</h2>
          <p className="text-sm text-text-secondary font-body mt-1">
            Look up any Cardano transaction hash to verify if it contains an AmVote ballot.
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <input
            type="text"
            value={hash}
            onChange={e => setHash(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="Paste transaction hash..."
            className="flex-1 px-4 py-3 rounded-xl bg-bg-surface border border-bg-border text-text-primary font-mono text-sm placeholder:text-text-muted focus:border-violet-500/50 focus:outline-none transition-all"
          />
          <button
            onClick={handleLookup}
            disabled={loading || !hash.trim()}
            className="px-6 py-3 rounded-xl font-heading font-semibold text-sm text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-violet-glow transition-all duration-200"
          >
            {loading ? 'Looking up...' : 'Look up'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {result.found ? (
              <>
                {/* TX Info card */}
                <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <p className="text-sm font-heading font-semibold text-green-500">Transaction Confirmed</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted font-body mb-1">Transaction Hash</p>
                    <p className="font-mono text-xs text-violet-300 bg-bg-elevated rounded-lg p-2 break-all">{result.hash}</p>
                  </div>
                  {result.block && (
                    <div>
                      <p className="text-xs text-text-muted font-body mb-1">Block</p>
                      <p className="font-mono text-sm text-text-primary">{result.block}</p>
                    </div>
                  )}
                  {result.fees && (
                    <div>
                      <p className="text-xs text-text-muted font-body mb-1">Fees</p>
                      <p className="font-mono text-sm text-text-primary">{(parseInt(result.fees) / 1000000).toFixed(6)} ADA</p>
                    </div>
                  )}
                  <a
                    href={`${electionSettings.explorerBaseUrl}/${result.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-body text-violet-400 hover:text-violet-300 underline underline-offset-2"
                  >
                    View on CardanoScan →
                  </a>
                </div>

                {/* Metadata card */}
                {ballotData ? (
                  <div className="bg-bg-surface border border-yellow-400/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-yellow-400/15 text-yellow-300 border border-yellow-400/30">1337</span>
                      <p className="text-sm font-heading font-semibold text-text-primary">AmVote Ballot Found</p>
                    </div>
                    {(ballotData as any).electionId && (
                      <div>
                        <p className="text-xs text-text-muted font-body mb-1">Election ID</p>
                        <p className="font-mono text-sm text-violet-300">{(ballotData as any).electionId}</p>
                      </div>
                    )}
                    {(ballotData as any).ballot && (
                      <div>
                        <p className="text-xs text-text-muted font-body mb-1">Ballot Choices</p>
                        <pre className="text-xs text-text-secondary font-mono bg-bg-elevated rounded-lg p-3 overflow-x-auto">
                          {JSON.stringify((ballotData as any).ballot, null, 2)}
                        </pre>
                      </div>
                    )}
                    {(ballotData as any).timestamp && (
                      <div>
                        <p className="text-xs text-text-muted font-body mb-1">Timestamp</p>
                        <p className="font-mono text-sm text-text-secondary">{new Date((ballotData as any).timestamp).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
                    <p className="text-sm text-text-muted font-body">No AmVote ballot (label 1337) found for this transaction.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-bg-surface border border-red-500/30 rounded-2xl p-5">
                <p className="text-sm text-red-400 font-body">
                  {result.error || 'Transaction not found. Check the hash and try again.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
