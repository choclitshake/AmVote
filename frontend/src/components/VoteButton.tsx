// frontend/src/components/VoteButton.tsx

import { useWallet } from '@meshsdk/react';
import type { VotingErrorCode } from '../hooks/useVoting';
import { electionSettings } from '../data/electionData';

interface VoteReceiptProps {
  txHash: string;
  electionId: string;
  selections: Record<string, string[]>; // positionId → [candidateId, ...]
  positionLabels: Record<string, string>; // positionId → display title
  candidateNames: Record<string, string>; // candidateId → display name
}

interface VoteButtonProps {
  // Pass these when showing a receipt after successful submission
  receipt?: VoteReceiptProps;
  // Pass these when in active submission state
  status?: string;
  error?: string | null;
  errorCode?: VotingErrorCode | null;
  isLoading?: boolean;
  onVoteSuccess?: (txHash: string) => void;
  onVoteError?: (error: string) => void;
}

export function VoteButton({
  receipt,
  status = 'idle',
  error,
  errorCode,
  isLoading = false,
}: VoteButtonProps) {
  const { connected } = useWallet();

  // ── Status indicator ──────────────────────────────────────────────────────
  const StatusIndicator = () => {
    const map: Record<string, { label: string; color: string }> = {
      checking:   { label: '🔍 Checking eligibility...', color: 'text-blue-600' },
      building:   { label: '🔨 Building transaction...', color: 'text-blue-600' },
      signing:    { label: '✍️ Waiting for wallet signature...', color: 'text-yellow-600' },
      submitting: { label: '📡 Submitting to blockchain...', color: 'text-purple-600' },
      confirmed:  { label: '✅ Transaction confirmed!', color: 'text-green-600' },
    };
    const current = map[status];
    if (!current) return null;
    return <p className={`text-sm font-medium mt-2 ${current.color}`}>{current.label}</p>;
  };

  // ── Error banner ──────────────────────────────────────────────────────────
  const ErrorBanner = () => {
    if (!error) return null;
    const isWarning = errorCode === 'USER_CANCELLED';
    const hints: Partial<Record<VotingErrorCode, string>> = {
      WALLET_DISCONNECTED: 'Connect your wallet using the button above.',
      WRONG_NETWORK:       'Switch to Preprod testnet in Eternl: Settings → Network.',
      MISSING_TOKEN:       'Contact the election admin to receive your VOTE_2025_PH token.',
      INSUFFICIENT_ADA:    'Get testnet ADA from the Cardano testnet faucet.',
      NO_COLLATERAL:       'In Eternl: Settings → Collateral → Set Collateral.',
      METADATA_TOO_LARGE:  'Try reducing the number of candidates selected.',
      TX_REJECTED:         'Wait a moment and try submitting again.',
      USER_CANCELLED:      'You cancelled. Click Confirm Vote to try again.',
    };
    const hint = errorCode ? hints[errorCode] : null;
    return (
      <div className={`mt-4 border rounded-lg p-4 ${isWarning ? 'bg-yellow-50 border-yellow-400' : 'bg-red-50 border-red-500'}`}>
        <p className={`font-semibold text-sm ${isWarning ? 'text-yellow-700' : 'text-red-700'}`}>
          {isWarning ? '⚠️' : '❌'} {error}
        </p>
        {hint && <p className={`text-xs mt-1 ${isWarning ? 'text-yellow-600' : 'text-red-600'}`}>💡 {hint}</p>}
      </div>
    );
  };

  // ── Receipt view (T13) ────────────────────────────────────────────────────
  if (receipt) {
    const { txHash, electionId, selections, positionLabels, candidateNames } = receipt;
    return (
      <div className="bg-green-50 border border-green-300 rounded-xl p-6 space-y-4">
        <div>
          <p className="text-lg font-bold text-green-800">✅ Vote Successfully Recorded</p>
          <p className="text-xs text-green-600 mt-1">Election ID: <span className="font-mono">{electionId}</span></p>
        </div>

        {/* Metadata summary */}
        <div className="bg-white rounded-lg border border-green-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ballot Summary</p>
          {Object.entries(selections).map(([posId, candidateIds]) => (
            <div key={posId}>
              <p className="text-sm font-semibold text-gray-700">{positionLabels[posId] ?? posId}</p>
              {candidateIds.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No selection</p>
              ) : (
                <ul className="list-disc list-inside text-xs text-gray-600">
                  {candidateIds.map(cid => (
                    <li key={cid}>{candidateNames[cid] ?? cid}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* TX hash */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Transaction Hash</p>
          <p className="font-mono text-xs bg-green-100 rounded p-2 break-all">{txHash}</p>
        </div>

        {/* CardanoScan link */}
        <a
          href={`${electionSettings.explorerBaseUrl}/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-semibold text-green-700 underline"
        >
          View on CardanoScan →
        </a>
      </div>
    );
  }

  // ── Loading / status view ─────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Processing...
        </div>
      )}
      <StatusIndicator />
      <ErrorBanner />
    </div>
  );
}