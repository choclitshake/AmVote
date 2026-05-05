pub type Candidate {
  id: Int,
  name: ByteArray,
  vote_count: Int,
}

pub type ElectionDatum {
  owner: ByteArray,
  title: ByteArray,
  candidates: List<Candidate>,
  voters: List<ByteArray>,
  deadline_start: Int,
  deadline_end: Int,
  is_open: Bool,
  next_candidate_id: Int,
}

pub type ElectionRedeemer {
  AddCandidate { name: ByteArray }
  RemoveCandidate { candidate_id: Int }
  CastVote { candidate_id: Int }
  CloseElection
}
