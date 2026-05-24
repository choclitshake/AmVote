# Comprehensive Walkthrough: AmVote Architecture Overhaul

This document provides a highly detailed breakdown of the recent architectural changes made to the AmVote system. We successfully transitioned from a complex, costly Plutus-based model to the highly secure **"Holy Grail" Architecture** (Self-Custody + Fee Delegation + Native Scripts).

---

## 1. Architectural Summary

We completely re-engineered how a vote is authorized and submitted to the blockchain to achieve three massive goals:
1. **Zero Cost for Voters:** The backend now intercepts the vote transaction and attaches the Admin's ADA to pay the network fee on the voter's behalf.
2. **No 5 ADA Collateral:** We deleted the Plutus smart contract and replaced it with a Cardano **Native Script**, which does not require collateral from the voter.
3. **Absolute Security:** We retained Self-Custody wallets (like Eternl). The Admin can never tamper with a vote because the voter cryptographically signs the transaction themselves.

---

## 2. Comprehensive Code Changes

### A. Plutus Smart Contract Deleted
- **Removed:** `contracts/amvote/validators/vote_policy.ak`
- **Why:** The Plutus contract was only being used to verify the Admin's signature. This was incredibly inefficient, as it required users to lock 5 ADA in collateral and bloated the transaction size. This logic has been entirely moved to the backend Native Script.

### B. New Node.js Backend Gatekeeper
We built an entire Node.js/Express backend inside the `/backend` directory to securely hold the Admin Seed Phrase and prevent double voting.
- **[NEW] `backend/src/db.ts`:** Implemented a local SQLite database that tracks registered voters. It maintains a strictly enforced schema: `Voters (voter_id, public_address, status)`.
- **[NEW] `backend/src/mesh.ts`:** Implemented the core MeshSDK logic.
  - Automatically initializes the Admin's `AppWallet` using the seed phrase in `.env`.
  - Generates the Native Script policy (`ForgeScript.withOneSignature(adminAddress)`).
  - Handles the complex logic of building the Mint & Burn transaction and executing **Fee Delegation** by selecting an Admin UTxO to pay the transaction fee.
- **[NEW] `backend/src/index.ts`:** The Express API server.
  - `POST /api/register`: Maps a Voter ID to their Cardano Public Address.
  - `POST /api/build-vote-tx`: Checks if the wallet is eligible in the database, generates the Mint & Burn transaction, signs it with the Admin Key, marks the voter as `voted`, and returns the partially-signed transaction to the frontend.

### C. Frontend Modifications
The frontend was stripped of its complex Web3 generation logic and simplified to act as a bridge between the voter and the new backend.
- **[MODIFY] `frontend/src/hooks/useVoting.ts`:** 
  - **Before:** This file was 416 lines long! It compiled Plutus scripts in the browser, calculated collateral, and manually built complex Mint & Burn transactions on the client side.
  - **After:** Shrunk to 120 lines. It simply calls `wallet.getChangeAddress()`, sends it to the backend's `/api/build-vote-tx` endpoint, receives the unsigned transaction, asks the Eternl wallet to sign it, and submits it to the blockchain.
- **[NEW] `frontend/src/pages/RegisterPage.tsx`:** 
  - Built a beautiful UI for voters to connect their Eternl wallet, input their official Voter ID, and securely register themselves in the backend database. 
- **[MODIFY] `frontend/src/App.tsx`:** 
  - Added routing for the new `/register` page.

---

## 3. How to Run the New System

To test the new election system, follow these steps:

> [!IMPORTANT]
> You must configure your Admin Wallet before starting the server. Create a wallet (e.g., in Eternl), fund it with some testnet ADA to pay for voter fees, and grab the 24-word seed phrase.

### Step 1: Start the Backend
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Open `backend/.env` and insert your real Blockfrost API Key and your Admin Seed Phrase.
3. Start the API server:
   ```bash
   npm run dev
   ```
   *The server will start on port 3001 and create `database.sqlite` automatically.*

### Step 2: Start the Frontend
1. Open a second terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Start the React app:
   ```bash
   npm run dev
   ```

### Step 3: Test the Voting Flow
1. Open your browser to `http://localhost:5173/register`.
2. Connect your test Eternl wallet, enter a test Voter ID (e.g., `TEST-001`), and click Register.
3. Navigate to the main dashboard (`/`). 
4. Select your candidates and click "Vote". 
5. The Eternl wallet will pop up asking for your signature. You will notice the transaction fee is **0 ADA** because the backend is paying it for you!
6. Sign and submit. Your vote is securely cast!
