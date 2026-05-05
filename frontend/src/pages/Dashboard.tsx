import { VoteCard } from '../components/VoteCard';

export function Dashboard() {
  return (
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <VoteCard title="Current Election" voteCount={0} />
      <VoteCard title="Active Voters" voteCount={0} />
      <VoteCard title="Time Remaining" voteCount={0} />
    </div>
  );
}