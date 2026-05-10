// frontend/src/lib/metadataSchema.ts
export interface BallotChoices {
  p: string;   // President candidate ID
  vp: string;  // Vice President candidate ID
  s: string[]; // Senator candidate IDs
}

export interface BallotMetadata {
  electionId: string;
  ballot: BallotChoices;
  timestamp: number;
  nonce: string;
}