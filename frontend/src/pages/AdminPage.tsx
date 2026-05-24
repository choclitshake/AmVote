import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';

const BACKEND_URL = 'http://localhost:3001';
const ADMIN_KEY_STORAGE = 'AMVOTE_ADMIN_KEY';

interface Voter {
  voter_id: string;
  public_address: string | null;
  status: string;
}
interface VotersResponse {
  voters: Voter[];
  counts: { total: number; pending: number; registered: number; voted: number };
}

const statusStyles: Record<string, string> = {
  pending:    'bg-bg-elevated text-text-secondary border-bg-border',
  registered: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',
  voted:      'bg-green-500/15 text-green-400 border-green-500/30',
};

export function AdminPage() {
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem(ADMIN_KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<VotersResponse | null>(null);
  const [idsInput, setIdsInput] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchVoters = useCallback(async (key: string): Promise<boolean> => {
    const res = await fetch(`${BACKEND_URL}/api/admin/voters`, {
      headers: { 'x-admin-key': key },
    });
    if (res.status === 401) return false;
    if (!res.ok) throw new Error('Failed to load voters');
    setData(await res.json());
    return true;
  }, []);

  // Try the stored key on mount
  useEffect(() => {
    if (!adminKey) return;
    fetchVoters(adminKey)
      .then(ok => setAuthed(ok))
      .catch(() => setAuthed(false));
  }, [adminKey, fetchVoters]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const ok = await fetchVoters(keyInput.trim());
      if (!ok) {
        setMessage({ type: 'err', text: 'Invalid admin key.' });
      } else {
        localStorage.setItem(ADMIN_KEY_STORAGE, keyInput.trim());
        setAdminKey(keyInput.trim());
        setAuthed(true);
      }
    } catch {
      setMessage({ type: 'err', text: 'Could not reach the backend. Is it running?' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey('');
    setAuthed(false);
    setData(null);
    setKeyInput('');
  };

  const handleAddVoters = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const voterIds = idsInput
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (voterIds.length === 0) {
      setMessage({ type: 'err', text: 'Enter at least one Voter ID.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/voters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ voterIds }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to add voters');
      setMessage({
        type: 'ok',
        text: `Added ${d.added} voter(s).${d.skipped?.length ? ` Skipped ${d.skipped.length} already-existing.` : ''}`,
      });
      setIdsInput('');
      await fetchVoters(adminKey);
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Failed to add voters' });
    } finally {
      setLoading(false);
    }
  };

  // ── Login gate ────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-bg-base">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-4 py-20">
          <form onSubmit={handleLogin} className="w-full max-w-sm bg-bg-surface p-8 rounded-xl border border-bg-border shadow-lg flex flex-col gap-4">
            <h2 className="text-2xl font-bold font-heading text-center text-text-primary m-0">Admin Access</h2>
            <p className="text-sm text-text-secondary font-body text-center">Enter the admin passphrase to manage the eligible-voters list.</p>
            <input
              type="password"
              placeholder="Admin passphrase"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !keyInput.trim()}
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Checking…' : 'Unlock'}
            </button>
            {message && (
              <p className={`text-sm text-center ${message.type === 'err' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>
            )}
          </form>
        </main>
      </div>
    );
  }

  // ── Admin dashboard ───────────────────────────────────────────
  const counts = data?.counts;

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-heading font-bold text-text-primary m-0">Election Admin</h2>
            <p className="text-sm text-text-secondary font-body mt-1">Pre-seed the eligible voters before the election opens.</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-sm font-body text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            Lock
          </button>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: counts?.total ?? 0, color: 'text-text-primary' },
            { label: 'Pending', value: counts?.pending ?? 0, color: 'text-text-secondary' },
            { label: 'Registered', value: counts?.registered ?? 0, color: 'text-yellow-300' },
            { label: 'Voted', value: counts?.voted ?? 0, color: 'text-green-400' },
          ].map(c => (
            <div key={c.label} className="bg-bg-surface border border-bg-border rounded-2xl p-4">
              <p className="text-xs text-text-muted font-body">{c.label}</p>
              <p className={`text-2xl font-heading font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Add voters */}
        <form onSubmit={handleAddVoters} className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-3">
          <h3 className="text-lg font-heading font-semibold text-text-primary m-0">Add eligible Voter IDs</h3>
          <p className="text-xs text-text-muted font-body">One per line, or comma-separated. e.g. <span className="font-mono">PH-2025-00001</span></p>
          <textarea
            value={idsInput}
            onChange={e => setIdsInput(e.target.value)}
            rows={4}
            placeholder="Enter Voter IDs here…"
            className="w-full px-4 py-2 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary font-mono text-sm transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !idsInput.trim()}
            className="px-5 py-2.5 rounded-xl font-heading font-semibold text-sm text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Adding…' : 'Add to eligible list'}
          </button>
          {message && (
            <p className={`text-sm ${message.type === 'err' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>
          )}
        </form>

        {/* Voter table */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-bg-border">
            <h3 className="text-sm font-heading font-semibold text-text-primary m-0">Voters ({data?.voters.length ?? 0})</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-bg-surface">
                <tr className="text-left text-text-muted font-body">
                  <th className="px-5 py-2 font-medium">Voter ID</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Wallet</th>
                </tr>
              </thead>
              <tbody>
                {data?.voters.map(v => (
                  <tr key={v.voter_id} className="border-t border-bg-border">
                    <td className="px-5 py-2 font-mono text-text-primary">{v.voter_id}</td>
                    <td className="px-5 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body border ${statusStyles[v.status] || statusStyles.pending}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-5 py-2 font-mono text-xs text-text-muted truncate max-w-[200px]">
                      {v.public_address ? `${v.public_address.slice(0, 14)}…` : '—'}
                    </td>
                  </tr>
                ))}
                {(!data || data.voters.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-text-muted font-body">No voters yet. Add some above.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
