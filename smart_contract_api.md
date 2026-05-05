# AmVote Smart Contract Documentation

## On-chain Types (`lib/amvote/types.ak`)

This module defines all shared types used by the AmVote election validator. After `aiken build`, these types are exported in `plutus.json` so the frontend (MeshSDK) can serialize datums and redeemers correctly.

### `Candidate`
Represents a single candidate in an election.
- `id`: Unique sequential identifier, auto-assigned by the contract.
- `name`: Human-readable name stored as a UTF-8 `ByteArray`.
- `vote_count`: Running total of votes received. Starts at 0.

### `ElectionDatum`
The on-chain state attached to the election UTxO. This is the single source of truth for one election — candidates, votes, timing, and access control are all stored here.
- `owner`: Public key hash of the election admin. Only this key may add/remove candidates or close the election.
- `title`: Human-readable election title.
- `candidates`: Ordered list of candidates.
- `voters`: List of voter public key hashes who have already cast a vote (used for double-vote prevention).
- `deadline_start`: POSIX timestamp (ms) when voting opens.
- `deadline_end`: POSIX timestamp (ms) when voting closes.
- `is_open`: `True` while the election accepts interactions; set to `False` by `CloseElection`.
- `next_candidate_id`: Counter for assigning the next unique candidate ID.

**Lifecycle:**
`[Created] ──AddCandidate──▶ [Setup] ──CastVote──▶ [Voting] ──CloseElection──▶ [Closed]`

### `ElectionRedeemer`
The action (redeemer) submitted alongside a transaction. Tells the validator what the user intends to do with the election UTxO.
- `AddCandidate`: Register a new candidate by name. (Owner only)
- `RemoveCandidate`: Remove an existing candidate by ID. (Owner only)
- `CastVote`: Vote for a candidate by ID. (Any voter)
- `CloseElection`: Permanently close the election. (Owner only)


## Helper / Utility Functions (`lib/amvote/helpers.ak`)

Reusable, pure validation functions extracted from the main validator so they can be unit-tested independently and composed cleanly. All functions in this module are pure predicates — they take data in and return `Bool`, `Option`, or a new value. They never perform side effects or access global state.

### `signed_by(signatories: List<ByteArray>, pkh: ByteArray) -> Bool`
Check whether a specific public key hash is present in a list of transaction signatories. Used to verify that a required party (e.g. the election owner) has actually signed the transaction.

### `is_eligible_voter(voters: List<ByteArray>, voter_pkh: ByteArray) -> Bool`
Check whether a voter is eligible to vote — meaning they have not already voted. Returns `True` if the voter's public key hash is NOT found in the existing voters list.

### `find_candidate(candidates: List<Candidate>, candidate_id: Int) -> Option<Candidate>`
Look up a candidate by their unique ID in the candidates list. Returns `Some(candidate)` if a match is found, `None` otherwise.

### `candidate_exists(candidates: List<Candidate>, candidate_id: Int) -> Bool`
A convenience wrapper around `find_candidate` that returns a simple `Bool`. Returns `True` if a candidate with the given ID exists, `False` otherwise.

### `is_valid_name(name: ByteArray) -> Bool`
Validate that a candidate name is not empty. Uses `bytearray.is_empty` from the standard library to check whether the provided name has zero bytes.

### `has_no_duplicate_name(candidates: List<Candidate>, name: ByteArray) -> Bool`
Check that no existing candidate already has the given name. Returns `True` if the name is unique (no duplicates), `False` if a candidate with the same name already exists.

### `is_within_voting_period(tx_validity_range: Interval, deadline_start: Int, deadline_end: Int) -> Bool`
Enforce that the transaction occurs within the election's voting window. Uses `interval.includes` from the Aiken standard library: Constructs a `voting_period` interval from `[deadline_start, deadline_end]`, and checks that the `voting_period` fully includes the transaction's `validity_range`. This means the transaction's entire validity window must fall inside the voting period. If the voter sets a validity range that extends past the deadline, the transaction is rejected.


## Election Validator (`validators/vote.ak`)

A Cardano Plutus V3 smart contract for transparent, tamper-proof elections.

### Features
- **Candidate CRUD**: Owner can add and remove candidates before closing.
- **Vote casting**: Any wallet can cast exactly one vote per election.
- **Double-vote prevention**: Voter public key hashes are recorded on-chain.
- **Time-range enforcement**: Votes are only accepted within the deadline window.
- **Owner-only admin**: Add/Remove/Close actions require owner's signature.

### How It Works
The election state lives in a single UTxO locked at this script's address. Every interaction spends that UTxO and creates a new one with the updated datum. This validator only decides whether the spend is allowed; the off-chain (frontend) code is responsible for constructing the correct output datum.

### `spend` Handler
The primary handler. Runs every time a transaction attempts to spend a UTxO locked at this script's address.

**Parameters:**
- `datum`: The current election state on the UTxO.
- `redeemer`: The action the user wants to perform.
- `_own_ref`: Reference to the UTxO being spent.
- `self`: The full transaction context.

**Validation Logic:**
Every election UTxO MUST have a datum attached. The validator routes to the correct action handler based on the redeemer:

1. **ADD CANDIDATE**: Checks that the owner signed the transaction, election is still open, candidate name is not empty, and there are no duplicate candidate names.
2. **REMOVE CANDIDATE**: Checks that the owner signed the transaction, election is still open, and the candidate actually exists.
3. **CAST VOTE**: Checks that the election is still open, at least one candidate is registered, the target candidate exists, transaction is within the voting deadline window, at least one wallet signed the transaction (the voter), and none of the signatories have already voted (no double-vote).
4. **CLOSE ELECTION**: Checks that the owner signed the transaction and the election is currently open.


## Deployment & Usage

### How to Build the Contract
To compile the smart contract and generate the Plutus blueprint (`plutus.json`), run the following command from the `contracts/amvote` directory:

```bash
aiken build
```
This command checks the syntax, type-checks the code, runs all unit tests, and outputs the compiled UPLC (Untyped Plutus Core) code into the `plutus.json` file. The frontend uses this file to interact with the contract.

### How to Deploy to Testnet
Unlike traditional smart contracts (like Ethereum), Cardano smart contracts don't need to be "deployed" to the blockchain beforehand. Instead, you generate the script address and lock funds at that address using a transaction.

To generate the testnet address for the compiled contract, run:

```bash
aiken address
```

This will output the testnet address based on the compiled script. You then construct an on-chain transaction (usually via the frontend using MeshSDK) that sends a UTxO to this address, attaching the initial `ElectionDatum` state.

### Contract Address on Testnet
The compiled AmVote contract address on the Cardano Preprod/Preview Testnet is:

```
addr_test1wpg4cz6hz0c8q55z8pyejj35e7wx8schf4nmyxcr4ucq90c2jqfh9
```
*(Note: If you modify the contract logic, `aiken build` will change the script hash, and this address will automatically change).*
