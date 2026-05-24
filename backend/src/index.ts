import express from 'express';
import cors from 'cors';
import { initDb, getDb } from './db';
import { buildMintAndBurnTx } from './mesh';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/register', async (req, res) => {
  const { voterId, publicAddress } = req.body;
  if (!voterId || !publicAddress) return res.status(400).json({ error: 'voterId and publicAddress required' });

  const db = getDb();
  try {
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
  const { publicAddress, ballot, electionId } = req.body;
  if (!publicAddress || !ballot || !electionId) {
    return res.status(400).json({ error: 'publicAddress, ballot, and electionId required' });
  }

  const db = getDb();
  try {
    const voter = await db.get('SELECT * FROM voters WHERE public_address = ?', [publicAddress]);
    if (!voter) return res.status(404).json({ error: 'Wallet not registered' });
    if (voter.status === 'voted') return res.status(403).json({ error: 'Voter already cast a ballot' });

    const partiallySignedTx = await buildMintAndBurnTx(voter.public_address, ballot, electionId);
    await db.run('UPDATE voters SET status = ? WHERE public_address = ?', ['voted', publicAddress]);

    res.json({ unsignedTx: partiallySignedTx });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

initDb().then(() => {
  app.listen(port, () => console.log(`AmVote Backend running on port ${port}`));
}).catch(console.error);
