interface Candidate {
  id: string;
  name: string;
  party: string;
  region: string;
}

interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function CandidateCard({ candidate, selected, onSelect, disabled }: CandidateCardProps) {
  return (
    <div
      onClick={() => !disabled && onSelect(candidate.id)}
      className={`
        relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer
        transition-all duration-200 active:scale-[0.98]
        ${selected
          ? 'border-amber-500 bg-amber-500/8 shadow-amber-glow'
          : 'border-bg-border bg-bg-surface hover:border-violet-500/50 hover:shadow-violet-sm'}
        ${disabled ? 'opacity-40 cursor-not-allowed hover:border-bg-border hover:shadow-none active:scale-100' : ''}
      `}
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shrink-0">
        <span className="text-sm font-heading font-bold text-white tracking-wide">
          {getInitials(candidate.name)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="font-heading font-semibold text-text-primary text-sm truncate">
          {candidate.name}
        </p>
        <p className="font-body text-xs text-text-secondary truncate mt-0.5">
          {candidate.party}
        </p>
        <span className="inline-block mt-1.5 bg-bg-elevated text-violet-300 text-[10px] font-body rounded-full px-2 py-0.5 border border-bg-border">
          {candidate.region}
        </span>
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-gradient flex items-center justify-center shadow-amber-sm">
          <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}