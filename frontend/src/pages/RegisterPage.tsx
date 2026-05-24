import { useState } from 'react';
import { Header } from '../components/Header';
import { useWallet } from '../hooks/useWallet';

export function RegisterPage() {
  const { isConnected, hasVoteToken, networkId } = useWallet();
  const [voterId, setVoterId] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setErrorMsg('Please connect your wallet first.');
      setStatus('error');
      return;
    }
    
    setStatus('submitting');
    setErrorMsg('');

    try {
      // In a real application, this would call a backend endpoint
      // e.g. await fetch('/api/register', { method: 'POST', body: JSON.stringify({ voterId, publicAddress }) })
      // For this demo, we simulate a network request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStatus('success');
    } catch (err) {
      setErrorMsg('Failed to register. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 sm:p-8">
          <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">Register to Vote</h2>
          <p className="text-text-secondary font-body mb-6">
            Link your physical Voter ID to your Cardano wallet address. You must do this before Election Day.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="voterId" className="block text-sm font-medium text-text-primary mb-1">
                National Voter ID
              </label>
              <input
                type="text"
                id="voterId"
                required
                value={voterId}
                onChange={(e) => setVoterId(e.target.value)}
                placeholder="e.g. PH-2025-XXXXX"
                className="w-full bg-bg-base border border-bg-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>

            <div className="p-4 rounded-lg bg-bg-base border border-bg-border">
              <p className="text-sm text-text-secondary mb-1">Wallet Status</p>
              {isConnected ? (
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Wallet Connected
                </div>
              ) : (
                <div className="flex items-center gap-2 text-text-muted text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-text-muted" />
                  Not Connected
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {errorMsg}
              </div>
            )}

            {status === 'success' ? (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <h3 className="text-green-500 font-medium mb-1">Registration Successful!</h3>
                <p className="text-green-500/80 text-sm">Your Voter ID has been securely linked to your wallet.</p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={status === 'submitting' || !isConnected}
                className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'submitting' ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Linking...
                  </>
                ) : (
                  'Link Wallet to Voter ID'
                )}
              </button>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
