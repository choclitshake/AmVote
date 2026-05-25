import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { ConfigPosition } from '../hooks/useElectionConfig';
import { Spinner } from '../components/ui/Spinner';

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
  registered: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
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

// SVG Icons
function ArrowLeftIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
}
function CopyIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function LockIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>;
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
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors font-body mb-8">
          <ArrowLeftIcon /> Back to Home
        </Link>
        <div className="w-full max-w-md animate-fade-up">
          <div className="glass-card p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
                <LockIcon />
              </div>
              <h2 className="text-2xl font-bold font-heading text-text-primary">Admin Access</h2>
              <p className="text-sm text-text-secondary font-body">Enter the admin passphrase to manage the voters list and configuration.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-body font-medium text-text-secondary mb-2">Admin Passphrase</label>
                <input
                  type="password"
                  placeholder="Enter admin passphrase…"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary font-body text-sm transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !keyInput.trim()}
                className="btn-violet w-full !py-3.5"
              >
                {loading ? <Spinner size="sm" /> : 'Unlock Admin Panel'}
              </button>

              {message && (
                <div className={`p-3 rounded-lg text-sm text-center border ${
                  message.type === 'err' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                }`}>
                  {message.text}
                </div>
              )}
            </form>
          </div>
        </div>
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
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-bg-border bg-bg-base/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-body text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeftIcon /> Home
          </Link>
          <div className="flex items-center gap-3">
            <span className="badge badge-pending font-mono">Admin Session</span>
            <button
              onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 font-body transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Election Console</h1>
          <p className="text-sm text-text-secondary font-body mt-1">Pre-seed voters, update election phases, and configure ballot positions.</p>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Voters', value: counts?.total ?? 0, accent: 'text-text-primary' },
            { label: 'Pending', value: counts?.pending ?? 0, accent: 'text-text-secondary' },
            { label: 'Registered', value: counts?.registered ?? 0, accent: 'text-amber-400' },
            { label: 'Voted / Burned', value: counts?.voted ?? 0, accent: 'text-green-400' },
          ].map(c => (
            <div key={c.label} className="glass-card p-5">
              <p className="text-xs text-text-muted font-body font-medium uppercase tracking-wider">{c.label}</p>
              <p className={`text-3xl font-heading font-bold mt-1.5 ${c.accent}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Action result message if any */}
        {message && (
          <div className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
            message.type === 'err' ? 'bg-red-500/8 text-red-400 border-red-500/20' : 'bg-green-500/8 text-green-400 border-green-500/20'
          }`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs opacity-60 hover:opacity-100 font-body">Dismiss</button>
          </div>
        )}

        {/* Two column layouts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left panel: Schedule and Voter preseed */}
          <div className="md:col-span-1 space-y-6">
            {/* Election Status & Schedule */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-heading font-bold text-text-primary uppercase tracking-wide">Status &amp; Schedule</h2>
                {election && (
                  <span className={`badge ${
                    election.status === 'Active'
                      ? 'badge-active'
                      : election.status === 'NotStarted'
                        ? 'badge-pending'
                        : 'badge-closed'
                  }`}>
                    {election.status}{election.override ? ` (Forced)` : ''}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-secondary font-body font-medium mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={startInput}
                    onChange={e => setStartInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary font-body font-medium mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={endInput}
                    onChange={e => setEndInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-bg-border">
                <button
                  onClick={() => saveElection('auto')}
                  disabled={loading}
                  className="btn-violet !py-2.5 !text-xs w-full"
                >
                  Save Schedule
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => saveElection('open')}
                    disabled={loading}
                    className="btn-ghost !py-2 !text-xs text-green-400 border-green-500/20 hover:border-green-500/40 hover:bg-green-500/5"
                  >
                    Force Open
                  </button>
                  <button
                    onClick={() => saveElection('closed')}
                    disabled={loading}
                    className="btn-ghost !py-2 !text-xs text-red-400 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5"
                  >
                    Force Close
                  </button>
                </div>
              </div>
            </div>

            {/* Voter preseed form */}
            <form onSubmit={handleAddVoters} className="glass-card p-5 space-y-4">
              <h2 className="text-sm font-heading font-bold text-text-primary uppercase tracking-wide">Add Eligible Voter IDs</h2>
              <p className="text-xs text-text-muted font-body">One per line, or comma-separated. e.g. <span className="font-mono text-amber-300">PH-2025-00001</span></p>
              <textarea
                value={idsInput}
                onChange={e => setIdsInput(e.target.value)}
                rows={4}
                placeholder="Enter Voter IDs here…"
                className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary font-mono text-xs"
              />
              <button
                type="submit"
                disabled={loading || !idsInput.trim()}
                className="btn-primary !py-2.5 !text-xs w-full"
              >
                {loading ? <Spinner size="sm" /> : 'Pre-seed Voter IDs'}
              </button>
            </form>
          </div>

          {/* Right panel: Ballot settings and Voter list */}
          <div className="md:col-span-2 space-y-6">

            {/* Ballot Config positions and candidates */}
            <div className="glass-card p-5 sm:p-6 space-y-5">
              <h2 className="text-sm font-heading font-bold text-text-primary uppercase tracking-wide">Ballot Config</h2>

              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {positions.map(pos => (
                  <div key={pos.id} className="border border-bg-border bg-bg-elevated/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-bg-border pb-2">
                      <div>
                        <span className="font-heading font-semibold text-text-primary text-sm">{pos.name}</span>
                        <span className="badge badge-muted ml-2 font-mono">Max: {pos.maxSelections}</span>
                      </div>
                      <button
                        onClick={() => deletePosition(pos.id)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                      >
                        <TrashIcon /> Delete Position
                      </button>
                    </div>

                    {/* Candidate lists */}
                    <ul className="divide-y divide-bg-border/40">
                      {pos.candidates.map(c => (
                        <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-xs font-body text-text-secondary">
                          <span className="truncate">
                            <span className="text-text-primary font-medium">{c.name}</span>
                            <span className="text-text-muted"> · {c.party} {c.region ? `(${c.region})` : ''}</span>
                          </span>
                          <button
                            onClick={() => deleteCandidate(c.id)}
                            className="text-text-muted hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                      {pos.candidates.length === 0 && (
                        <li className="py-2 text-xs text-text-muted font-body italic text-center">No candidates configured.</li>
                      )}
                    </ul>

                    {/* Add Candidate Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
                      <input
                        placeholder="Name"
                        value={candInputs[pos.id]?.name || ''}
                        onChange={e => setCand(pos.id, 'name', e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-xs"
                      />
                      <input
                        placeholder="Party"
                        value={candInputs[pos.id]?.party || ''}
                        onChange={e => setCand(pos.id, 'party', e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-xs"
                      />
                      <input
                        placeholder="Region"
                        value={candInputs[pos.id]?.region || ''}
                        onChange={e => setCand(pos.id, 'region', e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-xs"
                      />
                      <button
                        onClick={() => addCandidate(pos.id)}
                        disabled={loading}
                        className="btn-ghost !py-1.5 !px-3 !text-xs text-center justify-center"
                      >
                        Add Cand.
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add position form */}
              <form onSubmit={addPosition} className="flex flex-wrap items-end gap-2 border-t border-bg-border pt-4">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-text-secondary font-body font-medium mb-1">New Position Name</label>
                  <input
                    placeholder="e.g. Governor"
                    value={newPosName}
                    onChange={e => setNewPosName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-xs"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-text-secondary font-body font-medium mb-1">Max Picks</label>
                  <input
                    type="number"
                    min="1"
                    value={newPosMax}
                    onChange={e => setNewPosMax(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border focus:border-violet-500 focus:outline-none text-text-primary text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !newPosName.trim()}
                  className="btn-violet !py-2.5 !px-4 !text-xs shrink-0"
                >
                  Add Position
                </button>
              </form>
            </div>

            {/* Voter search list table */}
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-bg-border space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-heading font-bold text-text-primary uppercase tracking-wide">
                    Eligible Voters List ({filteredVoters.length} of {allVoters.length})
                  </h2>
                  <button
                    onClick={() => fetchVoters(adminKey)}
                    className="text-xs font-body text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    ↻ Refresh
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                      <SearchIcon />
                    </span>
                    <input
                      value={voterSearch}
                      onChange={e => setVoterSearch(e.target.value)}
                      placeholder="Search Voter ID or wallet…"
                      className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-bg-elevated border border-bg-border focus:outline-none focus:border-violet-500 text-text-primary text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'pending', 'registered', 'voted'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setVoterFilter(f)}
                        className={`px-2.5 py-1 rounded-full text-xs font-body border capitalize transition-colors ${
                          voterFilter === f
                            ? 'bg-violet-500/20 text-violet-200 border-violet-500/40'
                            : 'bg-bg-elevated text-text-muted border-bg-border hover:text-text-secondary'
                        }`}
                      >
                        {f}
                        {f !== 'all' && counts ? ` (${counts[f as 'pending' | 'registered' | 'voted']})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg-elevated/40 text-text-muted text-xs font-body uppercase border-b border-bg-border">
                      <th className="px-5 py-2.5 font-semibold">Voter ID</th>
                      <th className="px-5 py-2.5 font-semibold">Status</th>
                      <th className="px-5 py-2.5 font-semibold">Wallet Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bg-border/30 text-xs">
                    {filteredVoters.map(v => (
                      <tr key={v.voter_id} className="hover:bg-bg-elevated/20 transition-colors">
                        <td className="px-5 py-3 font-mono font-medium text-text-primary">{v.voter_id}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-body border capitalize ${statusStyles[v.status] || statusStyles.pending}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {v.public_address ? (
                            <button
                              onClick={() => copyAddress(v.public_address!)}
                              title={`${v.public_address} — click to copy`}
                              className="font-mono text-text-muted hover:text-violet-300 transition-colors flex items-center gap-1.5"
                            >
                              <span className="truncate max-w-[120px] inline-block">{v.public_address}</span>
                              {copiedAddr === v.public_address ? <CheckIcon /> : <CopyIcon />}
                            </button>
                          ) : (
                            <span className="text-text-muted italic">Not connected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredVoters.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-text-muted font-body italic">
                          {allVoters.length === 0 ? 'No voters added yet.' : 'No matching voters found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
