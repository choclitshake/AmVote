import { useState } from 'react';
import { CandidateCard } from './CandidateCard';
import { BallotReviewModal } from './BallotReviewModal';

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

interface BallotProps {
  positions: BallotPosition[];
  onSubmit: (selections: Record<string, string[]>) => void;
  disabled?: boolean;
}

export function Ballot({ positions, onSubmit, disabled }: BallotProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [showReview, setShowReview] = useState(false);

  const handleSelect = (positionId: string, candidateId: string, maxChoices: number) => {
    setSelections(prev => {
      const current = prev[positionId] || [];
      if (current.includes(candidateId)) {
        return { ...prev, [positionId]: current.filter(id => id !== candidateId) };
      }
      if (current.length >= maxChoices) return prev;
      return { ...prev, [positionId]: [...current, candidateId] };
    });
  };

  return (
    <div className="space-y-8">
      {positions.map(position => (
        <div key={position.id} className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">
              {position.title}
            </h2>
            <span className="text-sm text-gray-500">
              {(selections[position.id] || []).length} / {position.maxChoices} selected
            </span>
          </div>

          {(selections[position.id] || []).length >= position.maxChoices && (
            <p className="text-xs text-amber-600 mb-3">
              Maximum selections reached for this position.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {position.candidates.map(candidate => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                selected={(selections[position.id] || []).includes(candidate.id)}
                onSelect={(id) => handleSelect(position.id, id, position.maxChoices)}
                disabled={
                  disabled ||
                  (!(selections[position.id] || []).includes(candidate.id) &&
                    (selections[position.id] || []).length >= position.maxChoices)
                }
              />
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={() => setShowReview(true)}
        disabled={disabled}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        Review Ballot
      </button>

      {showReview && (
        <BallotReviewModal
          positions={positions}
          selections={selections}
          onConfirm={() => { setShowReview(false); onSubmit(selections); }}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  );
}