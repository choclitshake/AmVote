use aiken/collection/list
use aiken/interval.{Interval}
use aiken/primitive/bytearray
use amvote/types.{Candidate}

pub fn signed_by(signatories: List<ByteArray>, pkh: ByteArray) -> Bool {
  list.has(signatories, pkh)
}

pub fn is_eligible_voter(voters: List<ByteArray>, voter_pkh: ByteArray) -> Bool {
  !list.has(voters, voter_pkh)
}

pub fn find_candidate(
  candidates: List<Candidate>,
  candidate_id: ByteArray,
) -> Option<Candidate> {
  list.find(candidates, fn(c) { c.id == candidate_id })
}

pub fn candidate_exists(candidates: List<Candidate>, candidate_id: ByteArray) -> Bool {
  when find_candidate(candidates, candidate_id) is {
    Some(_) -> True
    None -> False
  }
}

pub fn is_valid_name(name: ByteArray) -> Bool {
  !bytearray.is_empty(name)
}

pub fn has_no_duplicate_name(
  candidates: List<Candidate>,
  name: ByteArray,
) -> Bool {
  !list.any(candidates, fn(c) { c.name == name })
}

pub fn is_within_voting_period(
  tx_validity_range: Interval,
  deadline_start: Int,
  deadline_end: Int,
) -> Bool {
  let voting_period = interval.between(deadline_start, deadline_end)
  interval.includes(voting_period, tx_validity_range)
}
