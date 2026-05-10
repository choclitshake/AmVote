export type ElectionStatus = 'NotStarted' | 'Active' | 'Closed';

export interface Position {
  name: string;
  maxChoices: number;
}

export interface Candidate {
  id: string; // short ID
  name: string;
  party: string;
  region: string;
}

export interface Election {
  owner: string;
  title: string;
  status: ElectionStatus;
  positions: Position[];
  deadlineStart: number;
  deadlineEnd: number;
}
