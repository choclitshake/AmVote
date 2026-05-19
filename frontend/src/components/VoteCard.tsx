interface VoteCardProps {
  title: string;
  value: string | number;
  label: string;
}

export function VoteCard({ title, value, label }: VoteCardProps) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 transition-all duration-200 hover:shadow-card">
      <p className="font-body text-text-secondary text-sm mb-2">{title}</p>
      <p className="font-heading font-bold text-yellow-400 text-3xl">{value}</p>
      <p className="font-body text-text-muted text-xs mt-1">{label}</p>
    </div>
  );
}