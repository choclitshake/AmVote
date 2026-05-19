interface Candidate {
  id: string;
  name: string;
  party: string;
  region: string;
}

interface BallotPosition {
  id: string;
  title: string;
  maxChoices: number;
  candidates: Candidate[];
}

interface BallotReviewModalProps {
  positions: BallotPosition[];
  selections: Record<string, string[]>;
  onConfirm: () => void;
  onClose: () => void;
}

export function BallotReviewModal({ positions, selections, onConfirm, onClose }: BallotReviewModalProps) {
  const getCandidateName = (positionId: string, candidateId: string) => {
    const position = positions.find(p => p.id === positionId);
    return position?.candidates.find(c => c.id === candidateId)?.name || candidateId;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-elevated border border-bg-border rounded-2xl shadow-card max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="p-6">
          {/* Title */}
          <h2 className="text-2xl font-heading font-bold text-text-primary mb-3">
            Review Your Ballot
          </h2>

          {/* Warning banner */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 mb-6">
            <span className="text-yellow-400 text-lg leading-none mt-0.5">⚠️</span>
            <p className="text-sm font-body text-yellow-300">
              This action is permanent and will be recorded on the Cardano blockchain. Your vote token will be burned.
            </p>
          </div>

          {/* Position blocks */}
          <div className="space-y-3 mb-6">
            {positions.map(position => (
              <div key={position.id} className="bg-bg-surface border border-bg-border rounded-xl p-4">
                <p className="font-heading font-semibold text-text-secondary uppercase text-xs tracking-wider mb-2">
                  {position.title}
                </p>
                {(selections[position.id] || []).length === 0 ? (
                  <p className="text-text-muted text-sm italic font-body">No selection</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(selections[position.id] || []).map(candidateId => (
                      <li key={candidateId} className="flex items-center gap-2 text-sm font-body">
                        <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-text-primary">{getCandidateName(position.id, candidateId)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Footer text */}
          <p className="text-xs text-text-muted mb-6 text-center font-body">
            By confirming, your vote will be permanently recorded on the Cardano blockchain.
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-bg-border text-text-secondary rounded-xl hover:border-violet-500/50 hover:text-text-primary font-heading font-semibold text-sm transition-all duration-200"
            >
              Go Back
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-violet-500 hover:bg-violet-400 text-white rounded-xl font-heading font-semibold text-sm transition-all duration-200 shadow-violet-glow hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Confirm & Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}