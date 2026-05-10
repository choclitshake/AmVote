interface Candidate {
  id: string;
  name: string;
  party: string;
  position: string;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Review Your Ballot</h2>
          <p className="text-sm text-amber-600 mb-6">
            ⚠️ This action is permanent and will be recorded on the blockchain.
          </p>

          <div className="space-y-4 mb-6">
            {positions.map(position => (
              <div key={position.id} className="border rounded-lg p-4">
                <p className="font-semibold text-gray-700 uppercase text-sm mb-2">
                  {position.title}
                </p>
                {(selections[position.id] || []).length === 0 ? (
                  <p className="text-gray-400 text-sm italic">No selection</p>
                ) : (
                  <ul className="space-y-1">
                    {(selections[position.id] || []).map(candidateId => (
                      <li key={candidateId} className="text-gray-800 text-sm flex items-center gap-2">
                        <span className="text-blue-500">✓</span>
                        {getCandidateName(position.id, candidateId)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mb-6 text-center">
            By confirming, your vote will be permanently recorded on the Cardano blockchain.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all"
            >
              Go Back
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-all"
            >
              Confirm & Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}