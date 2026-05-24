import { MeshWallet, BlockfrostProvider, ForgeScript, Transaction, resolveNativeScriptHash, resolvePaymentKeyHash } from '@meshsdk/core';
import { deserializeAddress, addressToBech32 } from '@meshsdk/core-cst';
import type { NativeScript } from '@meshsdk/common';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.BLOCKFROST_API_KEY) console.warn('BLOCKFROST_API_KEY not set');
if (!process.env.ADMIN_SEED_PHRASE) console.warn('ADMIN_SEED_PHRASE not set');

export const provider = new BlockfrostProvider(process.env.BLOCKFROST_API_KEY || '');
export const adminWallet = new MeshWallet({
  networkId: 0,
  fetcher: provider,
  submitter: provider,
  key: {
    type: 'mnemonic',
    words: (process.env.ADMIN_SEED_PHRASE || '').split(' '),
  },
});

export async function getNativeScriptPolicy() {
  const adminAddress = await adminWallet.getChangeAddress();
  return ForgeScript.withOneSignature(adminAddress);
}

export async function buildMintAndBurnTx(voterAddress: string, ballotMetadata: any, electionId: string) {
  const forgingScript = await getNativeScriptPolicy();
  
  // Resolve the policy ID from the forging script
  const adminAddress = await adminWallet.getChangeAddress();
  const keyHash = resolvePaymentKeyHash(adminAddress);
  const nativeScriptObj: NativeScript = { type: 'sig', keyHash };
  const policyId = resolveNativeScriptHash(nativeScriptObj);
  const assetNameHex = Buffer.from('VOTE_2025_PH').toString('hex');
  const tokenUnit = policyId + assetNameHex;

  const tx = new Transaction({ initiator: adminWallet });

  tx.mintAsset(forgingScript, {
    assetName: 'VOTE_2025_PH',
    assetQuantity: '1'
  });

  tx.setMetadata(1337, { electionId, ballot: ballotMetadata, timestamp: Date.now() });
  tx.setMetadata(674, { msg: ['AmVote Submission'] });
  
  // Send only the minted token + minimum required ADA to the voter
  tx.sendAssets(voterAddress, [
    { unit: tokenUnit, quantity: '1' }
  ]);

  const unsignedTx = await tx.build();
  return await adminWallet.signTx(unsignedTx, true);
}

export async function buildBurnTx(voterChangeAddress: string) {
  const forgingScript = await getNativeScriptPolicy();
  const adminAddress = await adminWallet.getChangeAddress();

  const keyHash = resolvePaymentKeyHash(adminAddress);
  const nativeScriptObj: NativeScript = { type: 'sig', keyHash };
  const policyId = resolveNativeScriptHash(nativeScriptObj);
  const assetNameHex = Buffer.from('VOTE_2025_PH').toString('hex');
  const tokenUnit = policyId + assetNameHex;

  // Convert hex address to bech32 if needed — Blockfrost only accepts bech32
  const bech32Address = voterChangeAddress.startsWith('addr')
    ? voterChangeAddress
    : addressToBech32(deserializeAddress(voterChangeAddress));
  console.log('[buildBurnTx] Resolved bech32 address:', bech32Address);

  // Find the UTXO at the voter's address that holds the token
  const voterUtxos = await provider.fetchAddressUTxOs(bech32Address, tokenUnit);
  if (!voterUtxos || voterUtxos.length === 0) {
    throw new Error(`VOTE_2025_PH token not found at address ${bech32Address} on Blockfrost`);
  }
  const tokenUtxo = voterUtxos[0];
  console.log('[buildBurnTx] Found token UTXO:', JSON.stringify(tokenUtxo));

  const tx = new Transaction({ initiator: adminWallet });

  // Use the Blockfrost-fetched UTXO as the explicit input
  tx.setTxInputs([tokenUtxo]);

  tx.burnAsset(forgingScript, {
    unit: tokenUnit,
    quantity: '1'
  });

  // Reclaim the ADA back to the admin wallet
  tx.setChangeAddress(adminAddress);

  const unsignedTx = await tx.build();
  return await adminWallet.signTx(unsignedTx, true);
}
