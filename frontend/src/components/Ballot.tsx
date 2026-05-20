import { useState } from 'react';
import { CandidateCard } from './CandidateCard';
import { BallotReviewModal } from './BallotReviewModal';

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

interface BallotProps {
  positions: BallotPosition[];
  onSubmit: (selections: Record<string, string[]>) => void;
  disabled?: boolean;
}

export function Ballot({ positions, onSubmit, disabled }: BallotProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('AMVOTE_CURRENT_SELECTIONS');
    return saved ? JSON.parse(saved) : {};
  });
  const [showReview, setShowReview] = useState(false);

  const handleSelect = (positionId: string, candidateId: string, maxChoices: number) => {
    setSelections(prev => {
      const current = prev[positionId] || [];
      let updated;
      if (current.includes(candidateId)) {
        updated = { ...prev, [positionId]: current.filter(id => id !== candidateId) };
      } else if (current.length >= maxChoices) {
        return prev;
      } else {
        updated = { ...prev, [positionId]: [...current, candidateId] };
      }
      localStorage.setItem('AMVOTE_CURRENT_SELECTIONS', JSON.stringify(updated));
      return updated;
    });
  };

  const filledPositions = positions.filter(p => (selections[p.id] || []).length > 0).length;
  const totalPositions = positions.length;
  const progressPercent = totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="sticky top-[105px] z-20 bg-bg-base/90 backdrop-blur-sm py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="font-body text-xs text-text-secondary">Ballot Progress</p>
          <p className="font-body text-xs text-text-muted">{filledPositions} of {totalPositions} positions filled</p>
        </div>
        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {positions.map(position => {
        const currentCount = (selections[position.id] || []).length;
        const maxReached = currentCount >= position.maxChoices;
        return (
          <div key={position.id} className="bg-bg-surface border border-bg-border rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-violet-500 rounded-full" />
                <h2 className="font-heading font-semibold text-text-primary uppercase tracking-wide text-sm sm:text-base">{position.title}</h2>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-body font-medium ${maxReached ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30' : 'bg-bg-elevated text-text-muted border border-bg-border'}`}>
                {currentCount} / {position.maxChoices}
              </span>
            </div>
            {maxReached && (
              <p className="text-xs text-yellow-400 font-body mb-3">⚠ Maximum selections reached for this position.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {position.candidates.map(candidate => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  selected={(selections[position.id] || []).includes(candidate.id)}
                  onSelect={(id) => handleSelect(position.id, id, position.maxChoices)}
                  disabled={disabled || (!(selections[position.id] || []).includes(candidate.id) && maxReached)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={() => setShowReview(true)}
        disabled={disabled}
        className="w-full py-4 rounded-xl font-heading font-semibold text-sm text-white bg-gradient-to-r from-violet-500 to-violet-400 hover:from-violet-400 hover:to-violet-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-violet-glow transition-all duration-200 flex items-center justify-center gap-2"
      >
        🔒 Review Ballot
      </button>

      {showReview && (
        <BallotReviewModal
          positions={positions}
          selections={selections}
          onConfirm={() => {
            setShowReview(false);
            localStorage.removeItem('AMVOTE_CURRENT_SELECTIONS');
            onSubmit(selections);
          }}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  );
}