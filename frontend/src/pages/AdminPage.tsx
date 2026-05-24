import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import type { ConfigPosition } from '../hooks/useElectionConfig';

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

interface ElectionInfo {
  status: 'NotStarted' | 'Active' | 'Closed';
  startTime: number | null;
  endTime: number | null;
  override: 'open' | 'closed' | null;
}

// epoch ms → 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">
function toLocalInput(ms: number | null): string {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminPage() {
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem(ADMIN_KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<VotersResponse | null>(null);
  const [idsInput, setIdsInput] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [election, setElection] = useState<ElectionInfo | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [positions, setPositions] = useState<ConfigPosition[]>([]);
  const [newPosName, setNewPosName] = useState('');
  const [newPosMax, setNewPosMax] = useState('1');
  const [candInputs, setCandInputs] = useState<Record<string, { name: string; party: string; region: string }>>({});
  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilter, setVoterFilter] = useState<'all' | 'pending' | 'registered' | 'voted'>('all');
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

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

  const fetchElection = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/election`);
      if (!res.ok) return;
      const d: ElectionInfo = await res.json();
      setElection(d);
      setStartInput(toLocalInput(d.startTime));
      setEndInput(toLocalInput(d.endTime));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchElection();
  }, [fetchElection]);

  const saveElection = async (override: 'auto' | 'open' | 'closed') => {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/election`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          startTime: startInput ? new Date(startInput).getTime() : null,
          endTime: endInput ? new Date(endInput).getTime() : null,
          override,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update election');
      setElection(d);
      setMessage({ type: 'ok', text: `Election updated — status: ${d.status}` });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Failed to update election' });
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/config`);
      if (!res.ok) return;
      const d = await res.json();
      setPositions(d.positions ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const setCand = (pid: string, field: 'name' | 'party' | 'region', value: string) =>
    setCandInputs(prev => ({
      ...prev,
      [pid]: { name: '', party: '', region: '', ...prev[pid], [field]: value },
    }));

  const addPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosName.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ name: newPosName.trim(), maxSelections: Number(newPosMax) || 1 }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add position');
      setNewPosName('');
      setNewPosMax('1');
      await fetchConfig();
      setMessage({ type: 'ok', text: 'Position added.' });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Failed to add position' });
    } finally {
      setLoading(false);
    }
  };

  const deletePosition = async (id: string) => {
    if (!window.confirm('Delete this position and all its candidates?')) return;
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/admin/positions/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      await fetchConfig();
    } finally {
      setLoading(false);
    }
  };

  const addCandidate = async (positionId: string) => {
    const input = candInputs[positionId] || { name: '', party: '', region: '' };
    if (!input.name.trim()) {
      setMessage({ type: 'err', text: 'Candidate name is required.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ positionId, name: input.name.trim(), party: input.party, region: input.region }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add candidate');
      setCandInputs(prev => ({ ...prev, [positionId]: { name: '', party: '', region: '' } }));
      await fetchConfig();
      setMessage({ type: 'ok', text: 'Candidate added.' });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Failed to add candidate' });
    } finally {
      setLoading(false);
    }
  };

  const deleteCandidate = async (id: string) => {
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/admin/candidates/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      await fetchConfig();
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddr(addr);
      setTimeout(() => setCopiedAddr(null), 1500);
    } catch {
      /* ignore */
    }
  };

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
  const allVoters = data?.voters ?? [];
  const filteredVoters = allVoters.filter(v => {
    const matchesFilter = voterFilter === 'all' || v.status === voterFilter;
    const q = voterSearch.trim().toLowerCase();
    const matchesSearch =
      !q || v.voter_id.toLowerCase().includes(q) || (v.public_address || '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

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
            Log out
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

        {/* Election schedule & status */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-heading font-semibold text-text-primary m-0">Election status</h3>
            {election && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-medium border ${
                election.status === 'Active'
                  ? 'bg-green-500/15 text-green-500 border-green-500/30'
                  : election.status === 'NotStarted'
                    ? 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30'
                    : 'bg-red-500/15 text-red-400 border-red-500/30'
              }`}>
                {election.status}{election.override ? ` (forced ${election.override})` : ''}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted font-body mb-1">Start time</label>
              <input
                type="datetime-local"
                value={startInput}
                onChange={e => setStartInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted font-body mb-1">End time</label>
              <input
                type="datetime-local"
                value={endInput}
                onChange={e => setEndInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => saveElection('auto')}
              disabled={loading}
              className="px-4 py-2 rounded-xl font-heading font-semibold text-sm text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-50 transition-all"
            >
              Save schedule
            </button>
            <button
              onClick={() => saveElection('open')}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-body text-green-400 border border-green-500/30 hover:bg-green-500/10 disabled:opacity-50 transition-all"
            >
              Force open
            </button>
            <button
              onClick={() => saveElection('closed')}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-body text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 transition-all"
            >
              Force close
            </button>
          </div>
          <p className="text-xs text-text-muted font-body">
            “Save schedule” opens/closes automatically based on the times above. “Force open/close” overrides the schedule until you save the schedule again.
          </p>
        </div>

        {/* Ballot — positions & candidates */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
          <h3 className="text-lg font-heading font-semibold text-text-primary m-0">Ballot — positions &amp; candidates</h3>

          {positions.map(pos => (
            <div key={pos.id} className="border border-bg-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-heading font-semibold text-text-primary">{pos.name}</span>
                  <span className="text-xs text-text-muted ml-2">pick up to {pos.maxSelections}</span>
                </div>
                <button onClick={() => deletePosition(pos.id)} className="text-xs text-red-400 hover:underline">
                  Delete position
                </button>
              </div>

              <ul className="divide-y divide-bg-border/50">
                {pos.candidates.map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <span className="text-text-primary truncate">
                      {c.name}
                      <span className="text-text-muted"> · {c.party}{c.region ? ` · ${c.region}` : ''}</span>
                    </span>
                    <button onClick={() => deleteCandidate(c.id)} className="text-xs text-red-400 hover:underline shrink-0">
                      Remove
                    </button>
                  </li>
                ))}
                {pos.candidates.length === 0 && (
                  <li className="py-1.5 text-xs text-text-muted">No candidates yet.</li>
                )}
              </ul>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  placeholder="Name"
                  value={candInputs[pos.id]?.name || ''}
                  onChange={e => setCand(pos.id, 'name', e.target.value)}
                  className="px-3 py-2 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-sm"
                />
                <input
                  placeholder="Party"
                  value={candInputs[pos.id]?.party || ''}
                  onChange={e => setCand(pos.id, 'party', e.target.value)}
                  className="px-3 py-2 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-sm"
                />
                <input
                  placeholder="Region"
                  value={candInputs[pos.id]?.region || ''}
                  onChange={e => setCand(pos.id, 'region', e.target.value)}
                  className="px-3 py-2 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-sm"
                />
                <button
                  onClick={() => addCandidate(pos.id)}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg text-sm font-body text-violet-300 border border-bg-border hover:border-violet-500/50 hover:bg-violet-500/10 disabled:opacity-50 transition-all"
                >
                  Add candidate
                </button>
              </div>
            </div>
          ))}

          <form onSubmit={addPosition} className="flex flex-wrap items-end gap-2 border-t border-bg-border pt-4">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-text-muted font-body mb-1">New position</label>
              <input
                placeholder="e.g. Governor"
                value={newPosName}
                onChange={e => setNewPosName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-sm"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs text-text-muted font-body mb-1">Max picks</label>
              <input
                type="number"
                min="1"
                value={newPosMax}
                onChange={e => setNewPosMax(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !newPosName.trim()}
              className="px-4 py-2 rounded-xl font-heading font-semibold text-sm text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-50 transition-all"
            >
              Add position
            </button>
          </form>
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
          <div className="px-5 py-3 border-b border-bg-border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-heading font-semibold text-text-primary m-0">
                Voters ({filteredVoters.length}{filteredVoters.length !== allVoters.length ? ` of ${allVoters.length}` : ''})
              </h3>
              <button
                onClick={() => fetchVoters(adminKey)}
                className="text-xs font-body text-violet-300 hover:text-violet-200 transition-colors"
              >
                ↻ Refresh
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                value={voterSearch}
                onChange={e => setVoterSearch(e.target.value)}
                placeholder="Search Voter ID or wallet…"
                className="flex-1 px-3 py-1.5 rounded-lg bg-bg-base border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'registered', 'voted'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setVoterFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body border capitalize transition-colors ${
                      voterFilter === f
                        ? 'bg-violet-500/20 text-violet-200 border-violet-500/40'
                        : 'bg-bg-elevated text-text-muted border-bg-border hover:text-text-secondary'
                    }`}
                  >
                    {f}
                    {f !== 'all' && counts ? ` ${counts[f as 'pending' | 'registered' | 'voted']}` : ''}
                  </button>
                ))}
              </div>
            </div>
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
                {filteredVoters.map(v => (
                  <tr key={v.voter_id} className="border-t border-bg-border hover:bg-bg-elevated/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-text-primary">{v.voter_id}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-body border ${statusStyles[v.status] || statusStyles.pending}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {v.public_address ? (
                        <button
                          onClick={() => copyAddress(v.public_address!)}
                          title={`${v.public_address} — click to copy`}
                          className="font-mono text-xs text-text-muted hover:text-violet-300 transition-colors"
                        >
                          {copiedAddr === v.public_address ? '✓ copied' : `${v.public_address.slice(0, 14)}…`}
                        </button>
                      ) : (
                        <span className="font-mono text-xs text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredVoters.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-text-muted font-body">
                      {allVoters.length === 0 ? 'No voters yet. Add some above.' : 'No voters match your search/filter.'}
                    </td>
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
