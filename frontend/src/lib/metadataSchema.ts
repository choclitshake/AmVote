export interface BallotChoices {
  p: string; // President short ID
  vp: string; // Vice President short ID
  s: string[]; // Senators short IDs 
}
export interface BallotMetadata {
  electionId: string;
  ballot: BallotChoices;
  timestamp: number;
  nonce: string;
}