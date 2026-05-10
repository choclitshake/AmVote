// Types (mirrors contract/lib/amvote/types.ak)

export interface Candidate {
  id: string;           // short unique ID used in contract redeemer
  name: string;
  party: string;
  region: string;
}

export interface Position {
  id: string;            // slug key e.g. "president"
  name: string;          // display label e.g. "President"
  maxSelections: number; // max_choices from contract Position type
  candidates: Candidate[];
}

export interface ElectionSettings {
  title: string;
  description: string;
  network: 'mainnet' | 'preview' | 'preprod';
  explorerBaseUrl: string;
  contractAddress: string;
  deadlineStart: string; // ISO date string
  deadlineEnd: string;   // ISO date string
}

// Election Settings

export const electionSettings: ElectionSettings = {
  title: 'AmVote 2025 General Election',
  description: 'A transparent, tamper-proof election powered by the Cardano blockchain.',
  network: 'preview',
  explorerBaseUrl: 'https://preview.cardanoscan.io/transaction',
  contractAddress: 'addr_test1wpg4cz6hz0c8q55z8pyejj35e7wx8schf4nmyxcr4ucq90c2jqfh9',
  deadlineStart: '2025-11-01T00:00:00Z',
  deadlineEnd: '2025-11-30T23:59:59Z',
};

// Election Data (positions + candidates)

export const electionData = {
  president: {
    id: 'president',
    name: 'President',
    maxSelections: 1,
    candidates: [
      { id: 'pres-001', name: 'Maria Santos',   party: 'Progressive Alliance',     region: 'National' },
      { id: 'pres-002', name: 'Juan dela Cruz',  party: 'National Unity Party',      region: 'National' },
      { id: 'pres-003', name: 'Elena Reyes',    party: "People's Democratic Front", region: 'National' },
    ] satisfies Candidate[],
  } satisfies Position,

  vice_president: {
    id: 'vice_president',
    name: 'Vice President',
    maxSelections: 1,
    candidates: [
      { id: 'vicepres-001', name: 'Mario Santos',   party: 'Progressive Alliance',     region: 'National' },
      { id: 'vicepres-002', name: 'Juanita dela Cruz',  party: 'National Unity Party',      region: 'National' },
      { id: 'vicepres-003', name: 'Eleanor Reyes',    party: "People's Democratic Front", region: 'National' },
    ] satisfies Candidate[],
  } satisfies Position,

  senators: {
    id: 'senators',
    name: 'Senator',
    maxSelections: 12,
    candidates: [
        { id: 'sen-001', name: 'Rafael Ilustre',   party: 'Progressive Alliance',     region: 'Luzon'    },
        { id: 'sen-002', name: 'Elena de Vega',    party: 'National Unity Party',      region: 'Visayas'  },
        { id: 'sen-003', name: 'Mateo Dimaculangan', party: "People's Democratic Front", region: 'Mindanao' },
        { id: 'sen-004', name: 'Clarissa Puno',    party: 'Progressive Alliance',     region: 'Mindanao' },
        { id: 'sen-005', name: 'Emilio Aguinaldo II', party: 'Independent',            region: 'Luzon'    },
        { id: 'sen-006', name: 'Isabela Santos',   party: 'National Unity Party',      region: 'Luzon'    },
        { id: 'sen-007', name: 'Julian del Pilar', party: 'Progressive Alliance',     region: 'Luzon'    },
        { id: 'sen-008', name: 'Bianca Castelo',   party: 'National Unity Party',      region: 'Visayas'  },
        { id: 'sen-009', name: 'Roman Silang',     party: "People's Democratic Front", region: 'Mindanao' },
        { id: 'sen-0010', name: 'Teresa Magbanua', party: 'Progressive Alliance',     region: 'Mindanao' },
        { id: 'sen-0011', name: 'Gabriel Luna',    party: 'Independent',              region: 'Luzon'    },
        { id: 'sen-0012', name: 'Felicity Reyes',  party: 'National Unity Party',      region: 'Luzon'    },
        { id: 'sen-0013', name: 'Lorenzo Tañada',  party: 'Progressive Alliance',     region: 'Luzon'    },
        { id: 'sen-0014', name: 'Victoria Gabor',  party: 'National Unity Party',      region: 'Visayas'  },
        { id: 'sen-0015', name: 'Dante Mabini',    party: "People's Democratic Front", region: 'Mindanao' },
        { id: 'sen-0016', name: 'Sonia Sotto',     party: 'Progressive Alliance',     region: 'Mindanao' },
        { id: 'sen-0017', name: 'Paolo Roxas',     party: 'Independent',              region: 'Luzon'    },
        { id: 'sen-0018', name: 'Marina Hontiveros', party: 'National Unity Party',    region: 'Luzon'    },
    ] satisfies Candidate[],
  } satisfies Position,
};