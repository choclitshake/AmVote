import { 
  BlockfrostProvider, 
  MeshWallet, 
  MeshTxBuilder, 
  applyParamsToScript,
  resolveScriptHash,
  resolvePaymentKeyHash,
  mConStr0,
  stringToHex
} from '@meshsdk/core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target wallets to assign 1 token each
const TARGET_WALLETS = [
  "addr_test1qrw...", // Replace with actual voter addresses
];

async function main() {
  const blockfrostApiKey = process.env.BLOCKFROST_PROJECT_ID;
  const adminMnemonic = process.env.ADMIN_MNEMONIC?.split(' ');

  if (!blockfrostApiKey || !adminMnemonic) {
    console.error("Missing BLOCKFROST_PROJECT_ID or ADMIN_MNEMONIC in environment.");
    process.exit(1);
  }

  // 1. Initialize Provider & Wallet (Testnet)
  const provider = new BlockfrostProvider(blockfrostApiKey);
  const wallet = new MeshWallet({
    networkId: 0, // 0 for testnet (Preprod/Preview)
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'mnemonic',
      words: adminMnemonic,
    },
  });

  const adminAddress = await wallet.getChangeAddress();
  // Get the PubKeyHash (hex) of the admin wallet to pass as parameter
  const adminPubKeyHash = resolvePaymentKeyHash(adminAddress);
  console.log("Admin Address:", adminAddress);
  console.log("Admin PKH:", adminPubKeyHash);

  // 2. Load the compiled Plutus script
  const plutusJsonPath = path.resolve(__dirname, '../../contracts/amvote/plutus.json');
  if (!fs.existsSync(plutusJsonPath)) {
    throw new Error(`plutus.json not found at ${plutusJsonPath}`);
  }
  
  const plutusJson = JSON.parse(fs.readFileSync(plutusJsonPath, 'utf-8'));
  const mintValidator = plutusJson.validators.find((v: any) => v.title === 'vote_policy.votePolicy.mint');
  
  if (!mintValidator) {
    throw new Error("Could not find vote_policy.votePolicy.mint in plutus.json");
  }

  // 3. Apply the admin PKH parameter to the script
  // The Aiken script expects `admin: ByteArray`
  const parameterizedScript = applyParamsToScript(
    mintValidator.compiledCode,
    [adminPubKeyHash],
    "JSON"
  );

  const policyId = resolveScriptHash(parameterizedScript, "V3");
  console.log("Voting Policy ID:", policyId);

  // The fixed asset name from T2 token.ak ("VOTE_2025_PH" in hex)
  const tokenNameHex = stringToHex("VOTE_2025_PH");
  const assetUnit = policyId + tokenNameHex;
  console.log("Asset Unit:", assetUnit);

  // 4. Build the transaction using MeshTxBuilder
  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    submitter: provider,
  });

  const utxos = await wallet.getUtxos();
  if (utxos.length === 0) {
    throw new Error("No UTXOs found in admin wallet.");
  }

  // Provide UTXOs for selection
  txBuilder.selectUtxosFrom(utxos);

  // 5. Set collateral (required for Plutus scripts)
  const collateral = await wallet.getCollateral();
  if (collateral.length > 0) {
    txBuilder.txInCollateral(
      collateral[0].input.txHash,
      collateral[0].input.outputIndex,
      collateral[0].output.amount,
      collateral[0].output.address
    );
  } else {
    // If no specific collateral is set, we can use a regular UTXO (must be pure ADA)
    const pureAdaUtxo = utxos.find(u => u.output.amount.length === 1);
    if (pureAdaUtxo) {
      txBuilder.txInCollateral(
        pureAdaUtxo.input.txHash,
        pureAdaUtxo.input.outputIndex,
        pureAdaUtxo.output.amount,
        pureAdaUtxo.output.address
      );
    }
  }

  // Mint 1 token for each target wallet
  TARGET_WALLETS.forEach((voterAddress) => {
    if (voterAddress.startsWith("addr_test")) {
      // Add a mint action for 1 token
      txBuilder
        .mint("1", policyId, tokenNameHex)
        .mintingScript(parameterizedScript)
        .mintPlutusScriptV3()
        // Note: We use MintVote redeemer. In token.ak: MintVote is index 0
        .mintRedeemerValue(mConStr0([]));

      // Send the minted token to the voter
      txBuilder.txOut(voterAddress, [{ unit: assetUnit, quantity: "1" }]);
    }
  });

  // Since the policy requires `is_signed_by_admin`, we must include the admin PKH as a required signer
  txBuilder.requiredSignerHash(adminPubKeyHash);
  txBuilder.changeAddress(adminAddress);

  // 5. Complete, sign, and submit
  try {
    const unsignedTx = await txBuilder.complete();
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);
    console.log("Successfully minted vote tokens! TxHash:", txHash);
  } catch (error) {
    console.error("Failed to submit minting transaction:", error);
  }
}

main().catch(console.error);