pub type Position {
  name: ByteArray,
  max_choices: Int,
}

pub type ElectionStatus {
  NotStarted
  Active
  Closed
}

pub type Candidate {
  id: ByteArray, // short ID
  name: ByteArray,
  party: ByteArray,
  region: ByteArray,
}

pub type ElectionDatum {
  owner: ByteArray,
  title: ByteArray,
  status: ElectionStatus,
  positions: List<Position>,
  deadline_start: Int,
  deadline_end: Int,
}

pub type ElectionRedeemer {
  UpdateStatus { status: ElectionStatus }
}
