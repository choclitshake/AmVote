import { useNavigate, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useElection } from '../hooks/useElection';
import { electionSettings } from '../data/electionData';

// SVG Icons (Lucide-style, inline)
function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const features = [
  {
    icon: <ShieldIcon />,
    title: 'Blockchain-Secured',
    description: 'Every ballot is recorded as an immutable transaction on the Cardano blockchain. Tamper-proof by design.',
    color: 'amber',
  },
  {
    icon: <EyeIcon />,
    title: 'Publicly Verifiable',
    description: 'Anyone can independently verify any vote using a transaction hash on any Cardano block explorer.',
    color: 'violet',
  },
  {
    icon: <LockIcon />,
    title: 'Vote Once, Securely',
    description: 'A native asset token is minted per voter, then burned after casting—preventing double-voting at the protocol level.',
    color: 'green',
  },
  {
    icon: <LinkIcon />,
    title: 'Wallet-Gated Access',
    description: 'Registration links your official Voter ID to your Cardano wallet, ensuring only eligible citizens can participate.',
    color: 'slate',
  },
];

const steps = [
  { num: '01', label: 'Connect Wallet', detail: 'Use any Cardano wallet (Eternl, Nami, Lace)' },
  { num: '02', label: 'Register', detail: 'Link your official Voter ID to your wallet address' },
  { num: '03', label: 'Cast Your Vote', detail: 'Select candidates and submit your encrypted ballot' },
  { num: '04', label: 'Verify Anytime', detail: 'Use your transaction hash to audit your vote on-chain' },
];

const colorMap: Record<string, { icon: string; border: string; glow: string }> = {
  amber:  { icon: 'text-amber-400',  border: 'border-amber-400/20',  glow: 'group-hover:shadow-amber-sm' },
  violet: { icon: 'text-violet-400', border: 'border-violet-400/20', glow: 'group-hover:shadow-violet-sm' },
  green:  { icon: 'text-green-400',  border: 'border-green-400/20',  glow: 'group-hover:shadow-green-glow' },
  slate:  { icon: 'text-slate-300',  border: 'border-slate-500/20',  glow: 'group-hover:shadow-card' },
};

export function LandingPage() {
  const navigate = useNavigate();
  const { isConnected } = useWallet();
  const { status: electionStatus } = useElection();

  const ctaLabel = isConnected
    ? electionStatus === 'Active' ? 'Cast Your Vote' : 'Go to Dashboard'
    : 'Get Started';

  const ctaTarget = isConnected ? '/vote' : '/register';

  return (
    <div className="min-h-screen bg-bg-base overflow-x-hidden">

      {/* ── Minimal top bar ──────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-md bg-bg-base/80">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-amber-gradient flex items-center justify-center shadow-amber-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l9 4.5V12l-9 9-9-9V6.5L12 2z" fill="rgba(0,0,0,0.8)" />
              <path d="M12 6l5 2.5V12l-5 5-5-5V8.5L12 6z" fill="rgba(0,0,0,0.5)" />
            </svg>
          </div>
          <span className="font-heading font-bold text-lg text-text-primary tracking-wide">AmVote</span>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            to="/results"
            id="nav-results"
            className="px-4 py-2 rounded-lg text-sm font-body text-text-muted hover:text-text-primary hover:bg-white/5 transition-all duration-200"
          >
            Results
          </Link>
          <Link
            to="/verify"
            id="nav-verify"
            className="px-4 py-2 rounded-lg text-sm font-body text-text-muted hover:text-text-primary hover:bg-white/5 transition-all duration-200"
          >
            Verify
          </Link>
          <button
            id="landing-cta-top"
            onClick={() => navigate(ctaTarget)}
            className="btn-primary ml-2 !py-2.5 !px-5 !text-sm"
          >
            {ctaLabel}
          </button>
        </nav>
      </header>

      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        {/* Mesh background */}
        <div className="absolute inset-0 bg-hero-mesh pointer-events-none" aria-hidden="true" />
        {/* Decorative blur circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/6 blur-[120px] pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-[100px] pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 text-center max-w-4xl mx-auto animate-fade-up">
          {/* Election status pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/20 bg-amber-400/8 text-amber-300 text-sm font-body mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow" />
            {electionStatus === 'Active' ? 'Election is Live' : electionStatus === 'NotStarted' ? 'Election Upcoming' : electionSettings.title}
          </div>

          <h1 className="font-heading font-black text-6xl sm:text-7xl md:text-8xl text-text-primary leading-[0.92] tracking-tight mb-6">
            AM<span className="text-amber-400">VOTE</span>
          </h1>
          <p className="text-xl sm:text-2xl text-text-secondary font-body font-light max-w-2xl mx-auto mb-4 leading-relaxed">
            The transparent, tamper-proof elections platform powered by the{' '}
            <span className="text-text-primary font-medium">Cardano blockchain</span>.
          </p>
          <p className="text-base text-text-muted font-body max-w-xl mx-auto mb-12">
            {electionSettings.description}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="hero-cta-primary"
              onClick={() => navigate(ctaTarget)}
              className="btn-primary text-base !px-8 !py-4 w-full sm:w-auto"
            >
              {ctaLabel} <ArrowRightIcon />
            </button>
            <Link
              id="hero-cta-results"
              to="/results"
              className="btn-ghost text-base !px-8 !py-4 w-full sm:w-auto"
            >
              View Live Results
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-sm text-text-muted font-body">
            {['Cardano Preview Network', 'Open-source & auditable', 'Zero server trust'].map(t => (
              <span key={t} className="flex items-center gap-1.5 text-green-400/80">
                <CheckIcon /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── What is AmVote ───────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-heading font-semibold tracking-widest text-amber-400 uppercase mb-3 block">About AmVote</span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-6 leading-tight">
              Elections that anyone can verify, no one can alter.
            </h2>
            <p className="text-text-secondary font-body leading-relaxed mb-4">
              AmVote replaces paper-based and centralized electronic voting with a cryptographically-secured process built entirely on the Cardano blockchain. Each vote is a native asset transaction — public, auditable, and immutable.
            </p>
            <p className="text-text-secondary font-body leading-relaxed mb-6">
              Registered voters receive a unique <span className="font-mono text-amber-300 text-sm">VOTE_2025_PH</span> token. Casting a ballot burns this token, permanently encoding the ballot data in transaction metadata. No central server controls the results — they live on the public ledger.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="badge badge-active">Decentralized</span>
              <span className="badge badge-voted">Cryptographic</span>
              <span className="badge badge-pending">Auditable</span>
            </div>
          </div>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Blockchain', value: 'Cardano', sub: 'Proof-of-Stake' },
              { label: 'Network', value: 'Preview', sub: 'Testnet environment' },
              { label: 'Vote Type', value: 'Native Asset', sub: 'CIP-25 tokens' },
              { label: 'Auditability', value: '100%', sub: 'Public ledger' },
            ].map(s => (
              <div key={s.label} className="glass-card p-5 text-center">
                <p className="text-2xl font-heading font-bold text-amber-400 mb-1">{s.value}</p>
                <p className="text-xs font-body font-medium text-text-primary">{s.label}</p>
                <p className="text-xs text-text-muted mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Features ─────────────────────────────────────── */}
      <section className="py-24 px-6 bg-bg-surface/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-heading font-semibold tracking-widest text-amber-400 uppercase mb-3 block">Key Features</span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary">Built for integrity, designed for transparency</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {features.map(f => {
              const c = colorMap[f.color];
              return (
                <div
                  key={f.title}
                  className={`group glass-card glass-card-hover cursor-default p-6 flex gap-5 transition-all duration-300 ${c.glow}`}
                >
                  <div className={`w-12 h-12 rounded-xl border ${c.border} flex items-center justify-center shrink-0 ${c.icon} bg-white/3`}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-text-primary text-base mb-2">{f.title}</h3>
                    <p className="text-sm font-body text-text-secondary leading-relaxed">{f.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-heading font-semibold tracking-widest text-amber-400 uppercase mb-3 block">How It Works</span>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary">Four steps to a verified vote</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={step.num} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-bg-border to-transparent z-0" aria-hidden="true" />
              )}
              <div className="relative z-10 glass-card p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-gradient flex items-center justify-center mx-auto mb-4 shadow-amber-sm">
                  <span className="font-heading font-bold text-sm text-black">{step.num}</span>
                </div>
                <h3 className="font-heading font-semibold text-text-primary text-sm mb-2">{step.label}</h3>
                <p className="text-xs text-text-muted font-body leading-relaxed">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center glass-card p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-mesh opacity-50 pointer-events-none" aria-hidden="true" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">Ready to cast your vote?</h2>
            <p className="text-text-secondary font-body mb-8 max-w-lg mx-auto">
              Connect your Cardano wallet, enter your Voter ID, and participate in the most transparent election in history.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="cta-banner-start"
                onClick={() => navigate(ctaTarget)}
                className="btn-primary text-base !px-8 !py-4 w-full sm:w-auto"
              >
                {ctaLabel} <ArrowRightIcon />
              </button>
              <Link to="/verify" id="cta-banner-verify" className="btn-ghost !px-8 !py-4 w-full sm:w-auto">
                Verify a Transaction
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-bg-border py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-muted font-body">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-text-primary">AmVote</span>
            <span>·</span>
            <span>{electionSettings.title}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/results" className="hover:text-text-primary transition-colors">Results</Link>
            <Link to="/verify" className="hover:text-text-primary transition-colors">Verify</Link>
            <Link to="/about" className="hover:text-text-primary transition-colors">About</Link>
            <Link to="/admin" className="hover:text-text-primary transition-colors">Admin</Link>
          </div>
          <span className="text-xs">Powered by Cardano · Preview Testnet</span>
        </div>
      </footer>
    </div>
  );
}
