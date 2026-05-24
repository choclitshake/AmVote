import express from 'express';
import cors from 'cors';
import { initDb, getDb } from './db';
import { buildMintAndBurnTx, getVoteTokenUnit, provider } from './mesh';
import { deserializeAddress, addressToBech32 } from '@meshsdk/core-cst';

const app = express();
const port = process.env.PORT || 3001;

function toBech32(addr: string) {
  if (!addr || addr.startsWith('addr')) return addr;
  try {
    return addressToBech32(deserializeAddress(addr));
  } catch (e) {
    return addr;
  }
}

app.use(cors());
app.use(express.json());

// Gate for admin-only routes. Uses a shared passphrase (ADMIN_API_KEY) sent as the
// `x-admin-key` header — NOT the wallet seed phrase, which never leaves the server.
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return res.status(500).json({ error: 'Admin API key not configured on server' });
  if (req.headers['x-admin-key'] !== key) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

type ElectionSettings = { start_time: number | null; end_time: number | null; override: string | null };
type ElectionStatus = 'NotStarted' | 'Active' | 'Closed';

// Derive election status from the schedule + manual override.
function computeStatus(s: ElectionSettings, now: number): ElectionStatus {
  if (s.override === 'closed') return 'Closed';
  if (s.override === 'open') return 'Active';
  if (s.start_time && now < s.start_time) return 'NotStarted';
  if (s.end_time && now > s.end_time) return 'Closed';
  return 'Active';
}

async function getElectionSettings(): Promise<ElectionSettings> {
  const db = getDb();
  const s = await db.get('SELECT start_time, end_time, override FROM election_settings WHERE id = 1');
  return s || { start_time: null, end_time: null, override: null };
}

app.post('/api/register', async (req, res) => {
  const { voterId, publicAddress } = req.body;
  if (!voterId || !publicAddress) return res.status(400).json({ error: 'voterId and publicAddress required' });

  const db = getDb();
  try {
    // A wallet can only be linked to one voter
    const walletTaken = await db.get('SELECT id FROM voters WHERE public_address = ?', [publicAddress]);
    if (walletTaken) return res.status(400).json({ error: 'This wallet is already registered.' });

    // Voter ID must be on the admin-seeded eligible list and not yet claimed
    const voter = await db.get('SELECT public_address FROM voters WHERE voter_id = ?', [voterId]);
    if (!voter) return res.status(403).json({ error: 'This Voter ID is not on the eligible voters list.' });
    if (voter.public_address) return res.status(400).json({ error: 'This Voter ID has already been claimed.' });

    await db.run(
      'UPDATE voters SET public_address = ?, status = ? WHERE voter_id = ?',
      [publicAddress, 'registered', voterId]
    );
    res.json({ success: true, message: 'Wallet successfully registered' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ── Admin: manage the eligible-voters list ────────────────────────────────
app.post('/api/admin/voters', requireAdmin, async (req, res) => {
  const { voterIds } = req.body;
  if (!Array.isArray(voterIds) || voterIds.length === 0) {
    return res.status(400).json({ error: 'voterIds (non-empty array) required' });
  }

  const db = getDb();
  let added = 0;
  const skipped: string[] = [];
  for (const raw of voterIds) {
    const id = String(raw).trim();
    if (!id) continue;
    try {
      await db.run('INSERT INTO voters (voter_id, status) VALUES (?, ?)', [id, 'pending']);
      added++;
    } catch {
      skipped.push(id); // already exists (UNIQUE constraint)
    }
  }
  res.json({ added, skipped });
});

app.get('/api/admin/voters', requireAdmin, async (_req, res) => {
  const db = getDb();
  const voters = await db.all('SELECT voter_id, public_address, status FROM voters ORDER BY voter_id');
  res.json({
    voters,
    counts: {
      total: voters.length,
      pending: voters.filter((v: any) => v.status === 'pending').length,
      registered: voters.filter((v: any) => v.status === 'registered').length,
      voted: voters.filter((v: any) => v.status === 'voted').length,
    },
  });
});

// ── Election schedule / status ────────────────────────────────────────────
// Public: anyone can read the current status (drives the voter UI countdown).
app.get('/api/election', async (_req, res) => {
  const s = await getElectionSettings();
  const now = Date.now();
  res.json({
    status: computeStatus(s, now),
    startTime: s.start_time,
    endTime: s.end_time,
    override: s.override,
    now,
  });
});

// Admin: set schedule and/or manual override.
// Body: { startTime?: number|null, endTime?: number|null, override?: 'open'|'closed'|'auto'|null }
app.put('/api/election', requireAdmin, async (req, res) => {
  const { startTime, endTime, override } = req.body;
  const ov = override === 'open' || override === 'closed' ? override : null;
  const start = startTime === null || startTime === undefined ? null : Number(startTime);
  const end = endTime === null || endTime === undefined ? null : Number(endTime);

  const db = getDb();
  await db.run(
    'UPDATE election_settings SET start_time = ?, end_time = ?, override = ? WHERE id = 1',
    [start, end, ov]
  );

  const s = await getElectionSettings();
  const now = Date.now();
  res.json({
    status: computeStatus(s, now),
    startTime: s.start_time,
    endTime: s.end_time,
    override: s.override,
    now,
  });
});

app.post('/api/build-vote-tx', async (req, res) => {
  const { publicAddress, changeAddress, ballot, electionId } = req.body;
  console.log('build-vote-tx received publicAddress:', publicAddress);
  if (!publicAddress || !ballot || !electionId) {
    return res.status(400).json({ error: 'publicAddress, ballot, and electionId required' });
  }

  const db = getDb();
  try {
    // Election must be open
    if (computeStatus(await getElectionSettings(), Date.now()) !== 'Active') {
      return res.status(403).json({ error: 'Voting is not currently open.' });
    }

    const voter = await db.get('SELECT * FROM voters WHERE public_address = ?', [publicAddress]);
    if (!voter) return res.status(404).json({ error: 'Wallet not registered' });
    if (voter.status === 'voted') return res.status(403).json({ error: 'Voter already cast a ballot' });
    if (voter.status === 'burned') return res.status(403).json({ error: 'Token already burned' });

    // Use changeAddress for transaction output, fallback to publicAddress if old frontend
    const targetAddress = toBech32(changeAddress || voter.public_address);
    const partiallySignedTx = await buildMintAndBurnTx(targetAddress, ballot, electionId);
    await db.run('UPDATE voters SET status = ? WHERE public_address = ?', ['voted', publicAddress]);

    res.json({ unsignedTx: partiallySignedTx });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tx-status/:hash', async (req, res) => {
  try {
    const { provider } = require('./mesh');
    const txInfo = await provider.fetchTxInfo(req.params.hash);
    if (txInfo) {
      return res.json({ confirmed: true });
    }
  } catch (err: any) {
    if (err.status === 404) {
      return res.json({ confirmed: false });
    }
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/build-burn-tx', async (req, res) => {
  const { publicAddress, voterChangeAddress } = req.body;
  if (!publicAddress || !voterChangeAddress) {
    return res.status(400).json({ error: 'publicAddress and voterChangeAddress required' });
  }

  const db = getDb();
  try {
    const voter = await db.get('SELECT * FROM voters WHERE public_address = ?', [publicAddress]);
    if (!voter) return res.status(404).json({ error: 'Wallet not registered' });
    if (voter.status !== 'voted') return res.status(403).json({ error: 'No vote to burn' });

    const { buildBurnTx } = require('./mesh');
    const partiallySignedTx = await buildBurnTx(voterChangeAddress);
    
    // Update status to burned
    await db.run('UPDATE voters SET status = ? WHERE public_address = ?', ['burned', publicAddress]);

    res.json({ unsignedTx: partiallySignedTx });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/status/:address', async (req, res) => {
  const { address } = req.params;
  if (!address) return res.status(400).json({ error: 'address required' });

  const db = getDb();
  try {
    const voter = await db.get(
      'SELECT voter_id, status FROM voters WHERE public_address = ?',
      [address]
    );
    if (!voter) {
      return res.json({ registered: false, hasVoted: false, status: 'unregistered' });
    }
    return res.json({
      registered: true,
      hasVoted: voter.status === 'voted' || voter.status === 'burned',
      status: voter.status,
      voterId: voter.voter_id,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Tally votes directly from the public chain: every vote mints the admin-signed
// VOTE token, so we collect all transactions for that asset and aggregate the
// label-1337 ballots. Authenticity is guaranteed because only the admin can mint.
app.get('/api/results/:electionId', async (req, res) => {
  const { electionId } = req.params;
  try {
    const { unit } = await getVoteTokenUnit();

    // 1. Collect every transaction that involved the vote token (paginated).
    const txHashes: string[] = [];
    let page = 1;
    while (true) {
      let batch: any;
      try {
        batch = await provider.get(`assets/${unit}/transactions?count=100&page=${page}&order=asc`);
      } catch {
        break; // asset not found yet (no votes) or no more pages
      }
      if (!Array.isArray(batch) || batch.length === 0) break;
      for (const t of batch) txHashes.push(t.tx_hash);
      if (batch.length < 100) break;
      page++;
    }

    // 2. Read each ballot (metadata label 1337) and aggregate per position/candidate.
    const tallies: Record<string, Record<string, number>> = {};
    let totalVotes = 0;
    const seen = new Set<string>();

    for (const hash of txHashes) {
      if (seen.has(hash)) continue;
      seen.add(hash);

      let meta: any;
      try {
        meta = await provider.get(`txs/${hash}/metadata`);
      } catch {
        continue;
      }
      const entry = Array.isArray(meta) ? meta.find((m: any) => String(m.label) === '1337') : null;
      const data = entry?.json_metadata;
      if (!data || data.electionId !== electionId) continue;

      const ballot = data.ballot || {};
      let counted = false;
      for (const positionId of Object.keys(ballot)) {
        const choices = ballot[positionId];
        if (!Array.isArray(choices)) continue;
        if (!tallies[positionId]) tallies[positionId] = {};
        for (const candidateId of choices) {
          tallies[positionId][candidateId] = (tallies[positionId][candidateId] || 0) + 1;
          counted = true;
        }
      }
      if (counted) totalVotes++;
    }

    res.json({ electionId, totalVotes, tallies, lastUpdated: Date.now() });
  } catch (error: any) {
    console.error('[results]', error);
    res.status(500).json({ error: error.message || 'Failed to compute results' });
  }
});

// ── Ballot configuration (positions + candidates) ─────────────────────────
const rid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

// Public: the ballot config consumed by the voter UI and results page.
app.get('/api/config', async (_req, res) => {
  const db = getDb();
  const positions = await db.all('SELECT id, name, max_selections FROM positions ORDER BY sort_order, name');
  const candidates = await db.all('SELECT id, position_id, name, party, region FROM candidates ORDER BY sort_order, name');
  res.json({
    positions: positions.map((p: any) => ({
      id: p.id,
      name: p.name,
      maxSelections: p.max_selections,
      candidates: candidates
        .filter((c: any) => c.position_id === p.id)
        .map((c: any) => ({ id: c.id, name: c.name, party: c.party, region: c.region })),
    })),
  });
});

app.post('/api/admin/positions', requireAdmin, async (req, res) => {
  const { name, maxSelections } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  const db = getDb();
  const order = await db.get('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM positions');
  const id = rid('pos');
  await db.run(
    'INSERT INTO positions (id, name, max_selections, sort_order) VALUES (?, ?, ?, ?)',
    [id, name.trim(), Number(maxSelections) > 0 ? Number(maxSelections) : 1, order.next]
  );
  res.json({ id });
});

app.delete('/api/admin/positions/:id', requireAdmin, async (req, res) => {
  const db = getDb();
  await db.run('DELETE FROM candidates WHERE position_id = ?', [req.params.id]);
  await db.run('DELETE FROM positions WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/admin/candidates', requireAdmin, async (req, res) => {
  const { positionId, name, party, region } = req.body;
  if (!positionId || !name || !name.trim()) {
    return res.status(400).json({ error: 'positionId and name required' });
  }
  const db = getDb();
  const pos = await db.get('SELECT id FROM positions WHERE id = ?', [positionId]);
  if (!pos) return res.status(404).json({ error: 'Position not found' });
  const order = await db.get('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM candidates WHERE position_id = ?', [positionId]);
  const id = rid('cand');
  await db.run(
    'INSERT INTO candidates (id, position_id, name, party, region, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [id, positionId, name.trim(), (party || '').trim(), (region || '').trim(), order.next]
  );
  res.json({ id });
});

app.delete('/api/admin/candidates/:id', requireAdmin, async (req, res) => {
  const db = getDb();
  await db.run('DELETE FROM candidates WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});


initDb().then(() => {
  app.listen(port, () => console.log(`AmVote Backend running on port ${port}`));
}).catch(console.error);
