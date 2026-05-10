// use aiken/collection/list
// use aiken/interval
// use amvote/helpers.{
//   candidate_exists, has_no_duplicate_name, is_eligible_voter, is_valid_name,
//   is_within_voting_period, signed_by,
// }
// use amvote/types.{
//   AddCandidate, Candidate, CastVote, CloseElection, ElectionDatum,
//   ElectionRedeemer, RemoveCandidate,
// }
// use cardano/transaction.{OutputReference, Transaction}
// 
// validator amvote {
//   spend(
//     datum: Option<ElectionDatum>,
//     redeemer: ElectionRedeemer,
//     _own_ref: OutputReference,
//     self: Transaction,
//   ) {
//     expect Some(d) = datum
// 
//     when redeemer is {
//       AddCandidate { name } -> and {
//           signed_by(self.extra_signatories, d.owner),
//           d.is_open,
//           is_valid_name(name),
//           has_no_duplicate_name(d.candidates, name),
//         }
// 
//       RemoveCandidate { candidate_id } -> and {
//           signed_by(self.extra_signatories, d.owner),
//           d.is_open,
//           candidate_exists(d.candidates, candidate_id),
//         }
// 
//       CastVote { candidate_id } -> and {
//           d.is_open,
//           !list.is_empty(d.candidates),
//           candidate_exists(d.candidates, candidate_id),
//           is_within_voting_period(
//             self.validity_range,
//             d.deadline_start,
//             d.deadline_end,
//           ),
//           !list.is_empty(self.extra_signatories),
//           list.all(
//             self.extra_signatories,
//             fn(signer) { is_eligible_voter(d.voters, signer) },
//           ),
//         }
// 
//       CloseElection -> and {
//           signed_by(self.extra_signatories, d.owner),
//           d.is_open,
//         }
//     }
//   }
// 
//   else(_) {
//     fail
//   }
// }
// 
// test signed_by_present() {
//   signed_by([#"aabb", #"ccdd", #"eeff"], #"ccdd")
// }
// 
// test signed_by_absent() {
//   !signed_by([#"aabb", #"ccdd"], #"9999")
// }
// 
// test signed_by_empty_list() {
//   !signed_by([], #"aabb")
// }
// 
// test eligible_voter_has_not_voted() {
//   is_eligible_voter([#"aabb"], #"ccdd")
// }
// 
// test eligible_voter_has_already_voted() {
//   !is_eligible_voter([#"aabb", #"ccdd"], #"ccdd")
// }
// 
// test eligible_voter_empty_voters_list() {
//   is_eligible_voter([], #"aabb")
// }
// 
// test candidate_exists_found() {
//   let cs = [Candidate { id: 1, name: "Alice", vote_count: 0 }]
//   candidate_exists(cs, 1)
// }
// 
// test candidate_exists_not_found() {
//   let cs = [Candidate { id: 1, name: "Alice", vote_count: 0 }]
//   !candidate_exists(cs, 99)
// }
// 
// test candidate_exists_empty_list() {
//   !candidate_exists([], 1)
// }
// 
// test valid_name_non_empty() {
//   is_valid_name("Alice")
// }
// 
// test valid_name_rejects_empty() {
//   !is_valid_name("")
// }
// 
// test no_duplicate_name_unique() {
//   let cs = [Candidate { id: 1, name: "Alice", vote_count: 0 }]
//   has_no_duplicate_name(cs, "Bob")
// }
// 
// test no_duplicate_name_collision() {
//   let cs = [Candidate { id: 1, name: "Alice", vote_count: 0 }]
//   !has_no_duplicate_name(cs, "Alice")
// }
// 
// test within_period_valid() {
//   let tx_range = interval.between(2000, 3000)
//   is_within_voting_period(tx_range, 1000, 5000)
// }
// 
// test within_period_before_start() {
//   let tx_range = interval.between(500, 800)
//   !is_within_voting_period(tx_range, 1000, 5000)
// }
// 
// test within_period_after_end() {
//   let tx_range = interval.between(6000, 7000)
//   !is_within_voting_period(tx_range, 1000, 5000)
// }
// 
// test within_period_overlaps_end() {
//   let tx_range = interval.between(4000, 6000)
//   !is_within_voting_period(tx_range, 1000, 5000)
// }
// 
// test within_period_exact_match() {
//   let tx_range = interval.between(1000, 5000)
//   is_within_voting_period(tx_range, 1000, 5000)
// }
