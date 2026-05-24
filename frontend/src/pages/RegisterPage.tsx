import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { Header } from '../components/Header';

export function RegisterPage() {
  const navigate = useNavigate();
  const { isConnected, address } = useWallet();
  const [voterId, setVoterId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [registeredId, setRegisteredId] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setStatus('error');
      setMessage('Please connect your wallet first.');
      return;
    }
    if (!voterId.trim()) {
      setStatus('error');
      setMessage('Please enter a Voter ID.');
      return;
    }

    setStatus('loading');
    setMessage('');

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
        setMessage('');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Network error. Is the backend running?');
    }
  };

  const handleRegisterAnother = () => {
    setVoterId('');
    setStatus('idle');
    setMessage('');
    setRegisteredId('');
  };

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-bg-surface p-8 rounded-xl border border-bg-border shadow-lg">
          {status === 'success' ? (
            /* ── Success view ─────────────────────────────────── */
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-3xl text-green-400">
                ✓
              </div>
              <h2 className="text-2xl font-bold font-heading text-text-primary m-0">Registered!</h2>
              <p className="text-sm text-text-secondary font-body">
                <span className="font-mono text-green-400">{registeredId}</span> is now linked to your wallet. You can cast your ballot.
              </p>

              <button
                onClick={() => navigate('/')}
                className="w-full py-3 px-4 rounded-lg font-medium text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 transition-all"
              >
                Go to Ballot →
              </button>
              <button
                onClick={handleRegisterAnother}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-violet-300 border border-bg-border hover:border-violet-500/50 hover:bg-violet-500/10 transition-all"
              >
                Register another account
              </button>
              <p className="text-xs text-text-muted font-body">
                To register a different voter, switch wallets using the button in the header, then click “Register another account”.
              </p>
            </div>
          ) : (
            /* ── Form view ────────────────────────────────────── */
            <>
              <h2 className="text-2xl font-bold font-heading mb-6 text-center text-text-primary">
                Voter Registration
              </h2>

              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="voterId" className="block text-sm font-medium text-text-secondary mb-1">
                    Official Voter ID
                  </label>
                  <input
                    id="voterId"
                    type="text"
                    placeholder="e.g. PH-2025-00001"
                    value={voterId}
                    onChange={(e) => setVoterId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary transition-colors"
                    disabled={status === 'loading'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isConnected || status === 'loading'}
                  className="w-full py-3 px-4 rounded-lg font-medium text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {status === 'loading' ? 'Registering...' : 'Register to Vote'}
                </button>

                {!isConnected && (
                  <p className="text-sm text-yellow-500 text-center mt-2">
                    ⚠️ Please connect your wallet using the button in the header.
                  </p>
                )}

                {message && status === 'error' && (
                  <div className="p-3 rounded-lg text-sm text-center mt-2 bg-red-500/10 text-red-400 border border-red-500/20">
                    {message}
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
