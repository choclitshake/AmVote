import { useState } from 'react';
import { useWallet } from '@meshsdk/react';
import type { VotingErrorCode } from '../hooks/useVoting';
import { electionSettings } from '../data/electionData';

interface VoteReceiptProps {
  txHash: string;
  electionId: string;
  selections: Record<string, string[]>;
  positionLabels: Record<string, string>;
  candidateNames: Record<string, string>;
}

interface VoteButtonProps {
  receipt?: VoteReceiptProps;
  status?: string;
  error?: string | null;
  errorCode?: VotingErrorCode | null;
  isLoading?: boolean;
  onVoteSuccess?: (txHash: string) => void;
  onVoteError?: (error: string) => void;
}

export function VoteButton({ receipt, status = 'idle', error, errorCode, isLoading = false }: VoteButtonProps) {
  const { connected } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Receipt view ──────────────────────────────────────────
  if (receipt) {
    const { txHash, electionId, selections, positionLabels, candidateNames } = receipt;
    return (
      <div className="bg-bg-surface border border-green-500/30 rounded-2xl p-6 space-y-5 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
        <div>
          <p className="text-xl font-heading font-bold text-green-500 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center text-base">✅</span>
            Vote Recorded On-Chain
          </p>
          <p className="text-xs text-text-secondary mt-2 font-body">
            Election ID: <span className="font-mono text-violet-300">{electionId}</span>
          </p>
        </div>

        {/* Ballot summary */}
        <div className="bg-bg-elevated rounded-xl border border-bg-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-heading font-semibold text-text-secondary uppercase tracking-wider">Ballot Summary</p>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-yellow-400/15 text-yellow-300 border border-yellow-400/30">1337</span>
          </div>
          {Object.entries(selections).map(([posId, candidateIds]) => (
            <div key={posId}>
              <p className="text-sm font-heading font-semibold text-text-primary">{positionLabels[posId] ?? posId}</p>
              {candidateIds.length === 0 ? (
                <p className="text-xs text-text-muted italic font-body">No selection</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {candidateIds.map(cid => (
                    <li key={cid} className="text-sm text-text-secondary font-body flex items-center gap-2">
                      <span className="text-violet-400">•</span>
                      {candidateNames[cid] ?? cid}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* TX hash */}
        <div>
          <p className="text-xs font-heading font-semibold text-text-secondary uppercase tracking-wider mb-2">Transaction Hash</p>
          <div className="flex items-center gap-2 bg-bg-elevated rounded-xl border border-bg-border p-3">
            <p className="font-mono text-xs text-violet-300 break-all flex-1">{txHash}</p>
            <button
              onClick={() => copyToClipboard(txHash)}
              className="shrink-0 px-2 py-1 rounded-lg bg-bg-surface border border-bg-border hover:border-violet-500/50 text-text-muted hover:text-text-primary text-xs transition-all duration-200"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* CardanoScan link */}
        <a
          href={`${electionSettings.explorerBaseUrl}/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-body font-semibold text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
        >
          View on CardanoScan
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    );
  }

  // ── Status / Error view ────────────────────────────────────
  const statusMap: Record<string, { label: string; color: string }> = {
    checking:   { label: '🔍 Checking eligibility...', color: 'text-violet-400' },
    building:   { label: '🔨 Building transaction...', color: 'text-violet-400' },
    signing:    { label: '✍️ Waiting for wallet signature...', color: 'text-yellow-400' },
    submitting: { label: '📡 Submitting to blockchain...', color: 'text-violet-300' },
    confirmed:  { label: '✅ Transaction confirmed!', color: 'text-green-500' },
  };

  const hints: Partial<Record<VotingErrorCode, string>> = {
    WALLET_DISCONNECTED: 'Connect your wallet using the button above.',
    WRONG_NETWORK:       'Switch to Preprod testnet in your wallet settings.',
    MISSING_TOKEN:       'Contact the election admin to receive your VOTE_2025_PH token.',
    INSUFFICIENT_ADA:    'Get testnet ADA from the Cardano testnet faucet.',
    NO_COLLATERAL:       'In Eternl: Settings → Collateral → Set Collateral.',
    METADATA_TOO_LARGE:  'Try reducing the number of candidates selected.',
    TX_REJECTED:         'Wait a moment and try submitting again.',
    USER_CANCELLED:      'You cancelled. Click Confirm Vote to try again.',
  };

  const currentStatus = statusMap[status];
  const isWarning = errorCode === 'USER_CANCELLED';

  return (
    <div className="space-y-3">
      {isLoading && (
        <div className="flex items-center gap-3 p-4 bg-bg-surface border border-bg-border rounded-xl">
          <span className="inline-block w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-body text-text-secondary">Processing your vote...</span>
        </div>
      )}
      {currentStatus && (
        <p className={`text-sm font-body font-medium ${currentStatus.color}`}>{currentStatus.label}</p>
      )}
      {error && (
        <div className={`border rounded-xl p-4 ${isWarning ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
          <p className={`font-body font-semibold text-sm ${isWarning ? 'text-yellow-400' : 'text-red-400'}`}>
            {isWarning ? '⚠️' : '❌'} {error}
          </p>
          {errorCode && hints[errorCode] && (
            <p className={`text-xs mt-1 font-body ${isWarning ? 'text-yellow-400/70' : 'text-red-400/70'}`}>
              💡 {hints[errorCode]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}