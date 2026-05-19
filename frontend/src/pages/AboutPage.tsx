import { Header } from '../components/Header';
import { electionSettings } from '../data/electionData';

const VOTE_POLICY_ID = '4e1cdbfe3e52395946921cf56878719cdfe211dde196a337df118864';

const steps = [
  { num: '01', title: 'Receive Vote Token', desc: 'The election administrator mints one VOTE_2025_PH token to each eligible voter\'s wallet address on the Cardano Preview testnet.' },
  { num: '02', title: 'Connect Wallet', desc: 'Connect your Cardano wallet (Eternl or Lace) to AmVote. The app checks that you are on the correct network and hold the vote token.' },
  { num: '03', title: 'Cast Your Ballot', desc: 'Select your candidates for each position: President, Vice President, and Senators. Review your choices carefully before confirming.' },
  { num: '04', title: 'Sign Transaction', desc: 'Your ballot is encoded as on-chain metadata (label 1337) and attached to a transaction that burns your VOTE_2025_PH token. You sign the transaction in your wallet.' },
  { num: '05', title: 'On-Chain Recording', desc: 'The signed transaction is submitted to the Cardano blockchain. Your vote is permanently and immutably recorded. The burned token prevents double-voting.' },
  { num: '06', title: 'Verify Anytime', desc: 'Anyone can look up a transaction hash on the Verify page or on CardanoScan to confirm that a vote was recorded and view its contents.' },
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* What is AmVote */}
        <section>
          <h2 className="text-2xl font-heading font-bold text-text-primary mb-3">What is AmVote?</h2>
          <p className="text-text-secondary font-body leading-relaxed">
            AmVote is a transparent, tamper-proof voting application built on the Cardano blockchain.
            It enables verifiable elections where every vote is permanently recorded on-chain, ensuring
            that results cannot be altered or fabricated. AmVote uses Cardano native tokens as
            non-transferable ballots and Plutus smart contracts to enforce one-person-one-vote.
          </p>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-2xl font-heading font-bold text-text-primary mb-6">How It Works</h2>
          <div className="space-y-4">
            {steps.map(step => (
              <div key={step.num} className="flex gap-4 bg-bg-surface border border-bg-border rounded-xl p-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                  <span className="font-heading font-bold text-sm text-violet-400">{step.num}</span>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-text-primary text-sm mb-1">{step.title}</h3>
                  <p className="text-text-secondary font-body text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security model */}
        <section>
          <h2 className="text-2xl font-heading font-bold text-text-primary mb-3">Security Model</h2>
          <div className="bg-bg-surface border border-bg-border rounded-xl p-5 space-y-3">
            <div>
              <h3 className="font-heading font-semibold text-violet-400 text-sm mb-1">Wallet Binding</h3>
              <p className="text-text-secondary font-body text-sm">Each voter receives exactly one VOTE_2025_PH token. The token is bound to their wallet address and cannot be transferred to another wallet after minting.</p>
            </div>
            <div>
              <h3 className="font-heading font-semibold text-violet-400 text-sm mb-1">Token Burn = Vote</h3>
              <p className="text-text-secondary font-body text-sm">Voting burns the token via a Plutus V3 smart contract. After voting, the token no longer exists, making double-voting impossible.</p>
            </div>
            <div>
              <h3 className="font-heading font-semibold text-violet-400 text-sm mb-1">Immutable Record</h3>
              <p className="text-text-secondary font-body text-sm">Ballot choices are stored as transaction metadata (label 1337) on the Cardano blockchain. Once confirmed, they cannot be modified or deleted.</p>
            </div>
            <div>
              <h3 className="font-heading font-semibold text-violet-400 text-sm mb-1">Public Verification</h3>
              <p className="text-text-secondary font-body text-sm">Anyone can independently verify any vote by looking up its transaction hash on a block explorer or via the AmVote Verify page.</p>
            </div>
          </div>
        </section>

        {/* Smart contract info */}
        <section>
          <h2 className="text-2xl font-heading font-bold text-text-primary mb-3">Smart Contract Info</h2>
          <div className="bg-bg-surface border border-bg-border rounded-xl p-5 space-y-3">
            <div>
              <p className="text-xs text-text-muted font-body mb-1">Vote Policy ID</p>
              <p className="font-mono text-sm text-violet-300 bg-bg-elevated rounded-lg p-2 break-all">{VOTE_POLICY_ID}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-body mb-1">Contract Address</p>
              <p className="font-mono text-sm text-violet-300 bg-bg-elevated rounded-lg p-2 break-all">{electionSettings.contractAddress}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-body mb-1">Network</p>
              <p className="font-mono text-sm text-text-primary">Cardano Preview Testnet</p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-body mb-1">Contract Type</p>
              <p className="font-mono text-sm text-text-primary">Plutus V3 (Aiken)</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
