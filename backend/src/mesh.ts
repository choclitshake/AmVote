import { MeshWallet, BlockfrostProvider, ForgeScript, Transaction, resolveNativeScriptHash, resolvePaymentKeyHash } from '@meshsdk/core';
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
  // ForgeScript returns a hex CBOR string - we need to extract the key hash to build
  // the NativeScript object that resolveNativeScriptHash expects.
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
