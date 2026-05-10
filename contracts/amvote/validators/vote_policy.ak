use aiken/collection/dict
use aiken/collection/list
use amvote/token.{BurnVote, MintVote, VoteTokenRedeemer, vote_token_name}
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}

validator votePolicy(admin: ByteArray) {
  mint(
    redeemer: VoteTokenRedeemer,
    policy_id: PolicyId,
    self: Transaction,
  ) {
    let Transaction { mint, extra_signatories, .. } = self
    let tokens = assets.tokens(mint, policy_id)

    when redeemer is {
      MintVote -> {
        let is_signed_by_admin = list.has(extra_signatories, admin)

        let token_pairs = dict.to_pairs(tokens)
        let valid_minting =
          list.all(
            token_pairs,
            fn(pair) {
              let Pair(asset_name, amount) = pair
              asset_name == vote_token_name && amount > 0
            },
          )

        is_signed_by_admin && valid_minting
      }
      BurnVote -> {
        let token_pairs = dict.to_pairs(tokens)
        let valid_burning =
          list.all(
            token_pairs,
            fn(pair) {
              let Pair(asset_name, amount) = pair
              asset_name == vote_token_name && amount < 0
            },
          )

        valid_burning
      }
    }
  }

  else(_) {
    fail
  }
}
