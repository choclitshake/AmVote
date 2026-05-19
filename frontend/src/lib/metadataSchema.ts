// frontend/src/lib/metadataSchema.ts
export interface BallotChoices {
  [positionId: string]: string[];
}

export interface BallotMetadata {
  electionId: string;
  ballot: BallotChoices;
  timestamp: number;
  nonce: string;
}