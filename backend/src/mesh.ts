import { MeshWallet, BlockfrostProvider, ForgeScript, Transaction } from '@meshsdk/core';
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
  
  const tx = new Transaction({ initiator: adminWallet });

  tx.mintAsset(forgingScript, {
    assetName: 'VOTE_2025_PH',
    assetQuantity: '1'
  });
  
  tx.mintAsset(forgingScript, {
    assetName: 'VOTE_2025_PH',
    assetQuantity: '-1'
  });

  tx.setMetadata(1337, { electionId, ballot: ballotMetadata, timestamp: Date.now() });
  tx.setMetadata(674, { msg: ['AmVote Submission'] });
  
  // Set the change address to the voter's address so they don't lose anything
  tx.setChangeAddress(voterAddress);

  const unsignedTx = await tx.build();
  return await adminWallet.signTx(unsignedTx, true);
}
