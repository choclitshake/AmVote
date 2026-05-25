import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useElection, formatCountdown } from '../hooks/useElection';
import { WalletConnect } from '../components/WalletConnect';
import { SuccessCheck } from '../components/SuccessCheck';
import { Spinner } from '../components/ui/Spinner';

// ── SVG Icons ───────────────────────────────────────────
function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ── Step Indicator ───────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3 justify-center mb-10">
      {Array.from({ length: total }, (_, i) => i + 1).map((step, i) => (
        <div key={step} className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-heading font-bold text-sm transition-all duration-300 ${
            step < current
              ? 'bg-amber-500 border-amber-500 text-black'
              : step === current
                ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                : 'border-bg-border text-text-muted'
          }`}>
            {step < current ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : step}
          </div>
          {i < total - 1 && (
            <div className={`h-px w-8 transition-all duration-500 ${step < current ? 'bg-amber-500' : 'bg-bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { isConnected, address } = useWallet();
  const { status: electionStatus, msUntilStart } = useElection();
  const [step, setStep] = useState<1 | 2>(1);
  const [voterId, setVoterId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [registeredId, setRegisteredId] = useState('');

  // Auto-advance to step 2 when wallet connects
  useEffect(() => {
    if (isConnected && step === 1) setStep(2);
  }, [isConnected]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) { setStatus('error'); setMessage('Please connect your wallet first.'); return; }
    if (!voterId.trim()) { setStatus('error'); setMessage('Please enter your Voter ID.'); return; }
    setStatus('loading'); setMessage('');

    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: voterId.trim(), publicAddress: address }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Registration failed.');
      } else {
        setRegisteredId(voterId.trim());
        setStatus('success');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Is the backend running?');
    }
  };

  const truncateAddr = (addr: string) =>
    addr.length > 20 ? `${addr.slice(0, 10)}…${addr.slice(-8)}` : addr;

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-bg-border">
        <Link to="/" id="register-back-home" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors font-body">
          <ArrowLeftIcon /> AmVote
        </Link>
        <span className="text-xs text-text-muted font-body">
          {isConnected && address ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="font-mono">{truncateAddr(address)}</span>
            </span>
          ) : 'No wallet connected'}
        </span>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-up">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-heading font-bold text-text-primary mb-2">Voter Registration</h1>
            <p className="text-sm text-text-secondary font-body">Link your official Voter ID to your Cardano wallet</p>
          </div>

          {/* Step indicator */}
          <StepIndicator current={status === 'success' ? 3 : step} total={2} />

          {/* ── SUCCESS STATE ──────────────────────────────── */}
          {status === 'success' ? (
            <div className="glass-card p-8 flex flex-col items-center gap-6 text-center animate-scale-in">
              <SuccessCheck size={64} />
              <div>
                <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">You're Registered!</h2>
                <p className="text-sm text-text-secondary font-body">
                  Voter ID <span className="font-mono text-amber-300">{registeredId}</span> is now linked to your wallet.
                </p>
              </div>

              {electionStatus === 'NotStarted' && msUntilStart !== null && (
                <div className="w-full rounded-xl border border-yellow-400/25 bg-yellow-400/8 px-4 py-3 text-sm text-yellow-300 font-body">
                  Voting opens in <span className="font-mono font-medium">{formatCountdown(msUntilStart)}</span>
                </div>
              )}
              {electionStatus === 'Active' && (
                <div className="w-full rounded-xl border border-green-500/25 bg-green-500/8 px-4 py-3 text-sm text-green-400 font-body">
                  Voting is open — cast your ballot now.
                </div>
              )}

              <div className="flex flex-col gap-3 w-full">
                {electionStatus === 'Closed' ? (
                  <button id="register-view-results" onClick={() => navigate('/results')} className="btn-primary w-full">
                    View Results <ArrowRightIcon />
                  </button>
                ) : (
                  <button id="register-go-vote" onClick={() => navigate('/vote')} className="btn-primary w-full">
                    {electionStatus === 'NotStarted' ? 'Go to Dashboard' : 'Cast Your Ballot'} <ArrowRightIcon />
                  </button>
                )}
                <button
                  id="register-another"
                  onClick={() => { setVoterId(''); setStatus('idle'); setMessage(''); setRegisteredId(''); setStep(1); }}
                  className="btn-ghost w-full"
                >
                  Register Another Voter
                </button>
              </div>
              <p className="text-xs text-text-muted font-body">
                To register a different voter, switch wallets, then click "Register Another Voter."
              </p>
            </div>
          ) : (
            <div className="glass-card p-8 space-y-6">
              {/* ── STEP 1: Connect Wallet ─────────────────── */}
              {step === 1 && (
                <div className="animate-fade-up space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-gradient flex items-center justify-center shadow-amber-sm shrink-0">
                      <span className="text-black font-heading font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-heading font-bold text-text-primary">Connect Your Wallet</h2>
                      <p className="text-xs text-text-muted font-body">Use a Cardano-compatible wallet</p>
                    </div>
                  </div>
                  <WalletConnect compact />
                  <p className="text-xs text-text-muted font-body text-center">
                    Supported: Eternl, Nami, Lace, Flint, and other CIP-30 wallets
                  </p>
                </div>
              )}

              {/* ── STEP 2: Voter ID ───────────────────────── */}
              {step === 2 && (
                <div className="animate-fade-up space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-gradient flex items-center justify-center shadow-amber-sm shrink-0">
                      <span className="text-black font-heading font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-heading font-bold text-text-primary">Enter Voter ID</h2>
                      <p className="text-xs text-text-muted font-body">Your official government-issued voter ID</p>
                    </div>
                  </div>

                  {/* Connected wallet indicator */}
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-500/8 border border-green-500/20">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-xs font-body text-green-400 font-medium">Wallet connected</span>
                    <span className="ml-auto font-mono text-xs text-text-muted">{truncateAddr(address)}</span>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label htmlFor="voterId" className="block text-sm font-body font-medium text-text-secondary mb-2">
                        Official Voter ID
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                          <UserIcon />
                        </span>
                        <input
                          id="voterId"
                          type="text"
                          placeholder="e.g. PH-2025-00001"
                          value={voterId}
                          onChange={e => setVoterId(e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl bg-bg-elevated text-text-primary font-body text-sm placeholder:text-text-muted focus:outline-none transition-all border ${
                            status === 'error' && message
                              ? 'border-red-500/50 focus:border-red-400'
                              : 'border-bg-border focus:border-amber-400/50'
                          }`}
                          disabled={status === 'loading'}
                          autoFocus
                        />
                      </div>
                      {status === 'error' && message && (
                        <p className="mt-2 text-sm text-red-400 font-body flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                          {message}
                        </p>
                      )}
                    </div>

                    <button
                      id="register-submit"
                      type="submit"
                      disabled={!isConnected || status === 'loading' || !voterId.trim()}
                      className="btn-primary w-full !py-3.5"
                    >
                      {status === 'loading' ? (
                        <><Spinner size="sm" /> Registering…</>
                      ) : (
                        <>Register to Vote <ArrowRightIcon /></>
                      )}
                    </button>
                  </form>

                  <button
                    id="register-back-step1"
                    onClick={() => setStep(1)}
                    className="text-xs text-text-muted hover:text-text-secondary font-body flex items-center gap-1 mx-auto transition-colors"
                  >
                    <ArrowLeftIcon /> Switch wallet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
