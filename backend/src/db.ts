import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function initDb() {
  db = await open({
    filename: path.join(__dirname, '../database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS voters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id TEXT UNIQUE NOT NULL,
      public_address TEXT,
      status TEXT DEFAULT 'pending'
    )
  `);

  // Single-row table for the election schedule + manual override.
  // start_time / end_time are epoch milliseconds (nullable).
  // override is 'open' | 'closed' | NULL (NULL = automatic, time-based).
  await db.exec(`
    CREATE TABLE IF NOT EXISTS election_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      start_time INTEGER,
      end_time INTEGER,
      override TEXT
    )
  `);
  await db.run(
    `INSERT OR IGNORE INTO election_settings (id, start_time, end_time, override) VALUES (1, NULL, NULL, NULL)`
  );

  // Ballot configuration: positions and their candidates.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_selections INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      position_id TEXT NOT NULL,
      name TEXT NOT NULL,
      party TEXT,
      region TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Seed the default ballot once. IDs match the original hardcoded electionData
  // so any votes already on-chain still tally correctly.
  const posCount = await db.get('SELECT COUNT(*) AS n FROM positions');
  if (!posCount || posCount.n === 0) {
    const seedPositions: Array<[string, string, number]> = [
      ['president', 'President', 1],
      ['vice_president', 'Vice President', 1],
      ['senators', 'Senator', 12],
    ];
    for (let i = 0; i < seedPositions.length; i++) {
      const [id, name, max] = seedPositions[i];
      await db.run(
        'INSERT INTO positions (id, name, max_selections, sort_order) VALUES (?, ?, ?, ?)',
        [id, name, max, i]
      );
    }

    const seedCandidates: Array<[string, string, string, string, string]> = [
      ['pres-001', 'president', 'Maria Santos', 'Progressive Alliance', 'National'],
      ['pres-002', 'president', 'Juan dela Cruz', 'National Unity Party', 'National'],
      ['pres-003', 'president', 'Elena Reyes', "People's Democratic Front", 'National'],
      ['vicepres-001', 'vice_president', 'Mario Santos', 'Progressive Alliance', 'National'],
      ['vicepres-002', 'vice_president', 'Juanita dela Cruz', 'National Unity Party', 'National'],
      ['vicepres-003', 'vice_president', 'Eleanor Reyes', "People's Democratic Front", 'National'],
      ['sen-001', 'senators', 'Rafael Ilustre', 'Progressive Alliance', 'Luzon'],
      ['sen-002', 'senators', 'Elena de Vega', 'National Unity Party', 'Visayas'],
      ['sen-003', 'senators', 'Mateo Dimaculangan', "People's Democratic Front", 'Mindanao'],
      ['sen-004', 'senators', 'Clarissa Puno', 'Progressive Alliance', 'Mindanao'],
      ['sen-005', 'senators', 'Emilio Aguinaldo II', 'Independent', 'Luzon'],
      ['sen-006', 'senators', 'Isabela Santos', 'National Unity Party', 'Luzon'],
      ['sen-007', 'senators', 'Julian del Pilar', 'Progressive Alliance', 'Luzon'],
      ['sen-008', 'senators', 'Bianca Castelo', 'National Unity Party', 'Visayas'],
      ['sen-009', 'senators', 'Roman Silang', "People's Democratic Front", 'Mindanao'],
      ['sen-0010', 'senators', 'Teresa Magbanua', 'Progressive Alliance', 'Mindanao'],
      ['sen-0011', 'senators', 'Gabriel Luna', 'Independent', 'Luzon'],
      ['sen-0012', 'senators', 'Felicity Reyes', 'National Unity Party', 'Luzon'],
      ['sen-0013', 'senators', 'Lorenzo Tañada', 'Progressive Alliance', 'Luzon'],
      ['sen-0014', 'senators', 'Victoria Gabor', 'National Unity Party', 'Visayas'],
      ['sen-0015', 'senators', 'Dante Mabini', "People's Democratic Front", 'Mindanao'],
      ['sen-0016', 'senators', 'Sonia Sotto', 'Progressive Alliance', 'Mindanao'],
      ['sen-0017', 'senators', 'Paolo Roxas', 'Independent', 'Luzon'],
      ['sen-0018', 'senators', 'Marina Hontiveros', 'National Unity Party', 'Luzon'],
    ];
    for (let i = 0; i < seedCandidates.length; i++) {
      const [id, pid, name, party, region] = seedCandidates[i];
      await db.run(
        'INSERT INTO candidates (id, position_id, name, party, region, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [id, pid, name, party, region, i]
      );
    }
  }

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}
