interface VoteButtonProps {
  status: 'idle' | 'loading' | 'pending' | 'confirmed' | 'failed' | 'already_voted';
  onVote: () => void;
  txHash?: string;
}

export function VoteButton({ status, onVote, txHash }: VoteButtonProps) {
  const statusConfig = {
    idle: { label: 'Cast Vote', color: 'bg-green-500 hover:bg-green-600', disabled: false },
    loading: { label: 'Preparing...', color: 'bg-gray-400', disabled: true },
    pending: { label: 'Submitting to Blockchain...', color: 'bg-yellow-500', disabled: true },
    confirmed: { label: 'Vote Confirmed ✓', color: 'bg-green-600', disabled: true },
    failed: { label: 'Transaction Failed', color: 'bg-red-500', disabled: false },
    already_voted: { label: 'Already Voted', color: 'bg-gray-500', disabled: true },
  };

  const config = statusConfig[status];

  return (
    <div className="space-y-3">
      <button
        onClick={onVote}
        disabled={config.disabled}
        className={`w-full py-4 text-white font-semibold rounded-xl transition-all ${config.color} disabled:cursor-not-allowed`}
      >
        {status === 'pending' && (
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
        )}
        {config.label}
      </button>

      {status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          ⏳ Transaction is being processed. Please don't close this window.
        </div>
      )}

    {status === 'confirmed' && txHash && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            ✅ Vote recorded!{' '}
            <p className="underline font-semibold inline">
                View on CardanoScan: {txHash}
            </p>
            </div>
        )}

      {status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          ❌ Transaction failed. Please try again.
        </div>
      )}

      {status === 'already_voted' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
          🗳️ You have already cast your vote in this election.
        </div>
      )}
    </div>
  );
}