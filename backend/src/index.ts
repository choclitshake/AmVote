import express from 'express';
import cors from 'cors';
import { initDb, getDb } from './db';
import { buildMintAndBurnTx } from './mesh';
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

app.post('/api/register', async (req, res) => {
  const { voterId, publicAddress } = req.body;
  if (!voterId || !publicAddress) return res.status(400).json({ error: 'voterId and publicAddress required' });

  const db = getDb();
  try {
    // Block same wallet from registering multiple times under different voter IDs
    const existing = await db.get('SELECT id FROM voters WHERE public_address = ?', [publicAddress]);
    if (existing) return res.status(400).json({ error: 'This wallet is already registered.' });

    await db.run(
      'INSERT INTO voters (voter_id, public_address, status) VALUES (?, ?, ?)',
      [voterId, publicAddress, 'registered']
    );
    res.json({ success: true, message: 'Wallet successfully registered' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE')) return res.status(400).json({ error: 'Voter ID already registered' });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/build-vote-tx', async (req, res) => {
  const { publicAddress, changeAddress, ballot, electionId } = req.body;
  console.log('build-vote-tx received publicAddress:', publicAddress);
  if (!publicAddress || !ballot || !electionId) {
    return res.status(400).json({ error: 'publicAddress, ballot, and electionId required' });
  }

  const db = getDb();
  try {
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

initDb().then(() => {
  app.listen(port, () => console.log(`AmVote Backend running on port ${port}`));
}).catch(console.error);
