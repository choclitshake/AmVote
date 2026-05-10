pub type BallotChoices {
  p: ByteArray,
  vp: ByteArray,
  s: List<ByteArray>,
}

pub type BallotMetadata {
  electionId: ByteArray,
  ballot: BallotChoices,
  timestamp: Int,
  nonce: ByteArray,
}
