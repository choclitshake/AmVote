import { AppWallet, BlockfrostProvider, ForgeScript, MeshTxBuilder } from '@meshsdk/core';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.BLOCKFROST_API_KEY) console.warn('BLOCKFROST_API_KEY not set');
if (!process.env.ADMIN_SEED_PHRASE) console.warn('ADMIN_SEED_PHRASE not set');

export const provider = new BlockfrostProvider(process.env.BLOCKFROST_API_KEY || '');
export const adminWallet = new AppWallet({
  networkId: 0,
  fetcher: provider,
  submitter: provider,
  key: {
    type: 'mnemonic',
    words: (process.env.ADMIN_SEED_PHRASE || '').split(' '),
  },
});

export async function getNativeScriptPolicy() {
  const adminAddress = adminWallet.getPaymentAddress();
  return ForgeScript.withOneSignature(adminAddress);
}

export async function buildMintAndBurnTx(voterAddress: string, ballotMetadata: any, electionId: string) {
  const forgingScript = await getNativeScriptPolicy();
  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  const assetNameHex = Buffer.from('VOTE_2025_PH').toString('hex');
  const policyId = forgingScript.toPolicyId();

  txBuilder.mint('1', policyId, assetNameHex);
  txBuilder.mintingScript(forgingScript.toCbor());
  txBuilder.mint('-1', policyId, assetNameHex);

  txBuilder.metadataValue(1337, { electionId, ballot: ballotMetadata, timestamp: Date.now() });
  txBuilder.metadataValue(674, { msg: ['AmVote Submission'] });
  txBuilder.changeAddress(voterAddress);

  const adminUtxos = await adminWallet.getUtxos();
  if (adminUtxos.length === 0) throw new Error('Admin wallet has no UTxOs to pay fees');
  txBuilder.selectUtxosFrom(adminUtxos, 1);

  const unsignedTx = await txBuilder.complete();
  return await adminWallet.signTx(unsignedTx, true);
}
