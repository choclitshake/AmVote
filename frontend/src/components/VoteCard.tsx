interface VoteCardProps {
  title: string;
  voteCount: number;
}

export function VoteCard({ title, voteCount }: VoteCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-2xl font-bold text-blue-600 mt-4">{voteCount}</p>
      <p className="text-gray-600">Total Votes</p>
    </div>
  );
}