# AmVote Token Minting Guide

This guide will walk you through the entire process of minting the **VOTE_2025_PH** native assets and distributing them to your voters on the Cardano Testnet.

## Step 1: Gather Your Prerequisites

Before you can run the script, you need three things:

1. **A Blockfrost API Key** 
   - Go to [Blockfrost.io](https://blockfrost.io/) and create a free account.
   - Create a new project and select the **Preprod** (or Preview) network.
   - Copy your `PROJECT_ID`.
2. **An Admin Wallet (with tADA)**
   - You need a 24-word recovery phrase (mnemonic) for the wallet that will act as the "Admin".
   - This wallet **must** have Testnet ADA (tADA) to pay for the minting transaction fees. You can get free tADA from the [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnet/tools/faucet/).
3. **Target Voter Addresses**
   - You need the receiving wallet addresses (starting with `addr_test1...`) of the voters who will receive the tokens.

---

## Step 2: Configure the Script

You need to tell the script *who* is receiving the tokens.

1. Open `frontend/scripts/mintVoteTokens.ts` in your editor.
2. Locate the `TARGET_WALLETS` array near the top of the file (around line 18).
3. Replace the placeholder with the actual addresses of your voters. For example:
   ```typescript
   const TARGET_WALLETS = [
     "addr_test1qru93x4...", // Voter 1
     "addr_test1qpg52t8...", // Voter 2
   ];
   ```
4. Save the file.

---

## Step 3: Set Your Environment Variables

The script needs your API key and Admin Mnemonic, but we don't hardcode these for security reasons. Open your **PowerShell** terminal and run the following commands to temporarily store them in your session:

```powershell
# 1. Navigate to the frontend directory
cd frontend

# 2. Set the Blockfrost API Key
$env:BLOCKFROST_PROJECT_ID="preprod..." 

# 3. Set the Admin Mnemonic (keep the quotes!)
$env:ADMIN_MNEMONIC="apple banana cherry dog elephant frog grape hat ice juice kite lemon..."
```

---

## Step 4: Run the Script

With everything configured, you are ready to execute the minting script. Ensure you are still inside the `frontend` directory in your PowerShell window.

1. **(Optional) Install dependencies** if you haven't already:
   ```powershell
   npm install
   ```

2. **Run the script** using `npx tsx` (which allows you to run TypeScript files directly in Node):
   ```powershell
   npx tsx scripts/mintVoteTokens.ts
   ```

---

## Step 5: Verify the Transaction

If everything is successful, your terminal will output something like this:

```text
Admin Address: addr_test1...
Admin PKH: a1b2c3d4...
Voting Policy ID: 8f9a3b...
Asset Unit: 8f9a3b...564f54455f323032355f5048
Successfully minted vote tokens! TxHash: e2b4c6d8...
```

1. Copy the **TxHash** from the output.
2. Go to a Cardano Testnet Explorer, such as [Preprod Cexplorer](https://preprod.cexplorer.io/).
3. Paste the TxHash into the search bar. 
4. You will be able to see the transaction confirmed on the blockchain, showing the newly minted `VOTE_2025_PH` tokens being deposited directly into your voters' wallets!
