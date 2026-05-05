# AmVote - Transparent Voting dApp on Cardano

## Project Overview
AmVote is a decentralized voting application built on Cardano that ensures transparent, tamper-proof elections while maintaining voter privacy through blockchain technology.

## Tech Stack
- **Frontend:** React + Vite, TypeScript, MeshSDK, TailwindCSS
- **Smart Contracts:** Aiken
- **Blockchain:** Cardano Testnet
- **API:** Blockfrost

## Quick Start

### Prerequisites
- Node.js v18+ 
- Cardano Wallet (Eternl, Lace, or MetaMask)
- Git
- Aiken CLI (for contract development)

### Installation

#### 1. Clone Repository
```bash
git clone https://github.com/choclitshake/AmVote
cd AmVote
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

#### 3. Smart Contract Setup
```bash
cd contracts
# Install Aiken CLI (see docs below)
aiken build
# Deploy to testnet (see Increment 1 docs)
```

### Project Structure
```AmVote/
├── frontend/              # React app (P2, P3, P4 work here)
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions & MeshSDK config
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── contracts/            # Aiken contracts (P1 works here)
│   ├── validators/       # Aiken validator files
│   ├── lib/             # Helper functions
│   └── aiken.toml
├── docs/                # Documentation
│   ├── INCREMENT_1.md   # Increment 1 details
│   ├── INCREMENT_2.md
│   └── SETUP.md
└── README.md
```

### Development Workflow

#### Branches
- `main` - Production-ready code & Integration branch
- `feature/[feature-name]` - Feature branches

#### Commit Convention
```[P1] Aiken: Add vote counter contract
[P2] Frontend: Implement wallet connection
[P3] UI: Build dashboard layout
[P4] Integration: Connect contract to frontend
```

### Deployment

#### Testnet
```bash
# Frontend
cd frontend
npm run build
# Deploy to Vercel/Netlify

# Contract
cd contracts
aiken build
# Deploy to Cardano Testnet
```

### Resources
- [MeshSDK Docs](https://meshjs.dev/)
- [Aiken Docs](https://aiken-lang.org/)
- [Cardano Docs](https://developers.cardano.org/)
- [TailwindCSS Docs](https://tailwindcss.com/)

### Team Members
- **P1 (Aiken Dev):** [P1]
- **P2 (Frontend Lead):** [P2]
- **P3 (UI Dev):** [P3]
- **P4 (Integration Dev):** [P4]
