interface Candidate {
  id: string;
  name: string;
  party: string;
  position: string;
}

interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function CandidateCard({ candidate, selected, onSelect, disabled }: CandidateCardProps) {
  return (
    <div
      onClick={() => !disabled && onSelect(candidate.id)}
      className={`
        flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
        ${selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Image placeholder */}
      <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
        <span className="text-2xl text-gray-400">👤</span>
      </div>

      {/* Info */}
      <div className="text-left">
        <p className="font-semibold text-gray-800">{candidate.name}</p>
        <p className="text-sm text-gray-500">{candidate.party}</p>
        <p className="text-xs text-blue-500">{candidate.position}</p>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="ml-auto w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
    </div>
  );
}