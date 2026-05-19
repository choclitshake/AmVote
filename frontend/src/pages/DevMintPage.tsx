import { useState } from 'react';
import { Header } from '../components/Header';
import { useWallet } from '../hooks/useWallet';
import { bech32 } from 'bech32';
import { 
  MeshTxBuilder, 
  BlockfrostProvider,
  BrowserWallet,
  applyParamsToScript,
  resolvePaymentKeyHash,
  resolveScriptHash,
  mConStr0,
  stringToHex
} from '@meshsdk/core';

const BLOCKFROST_KEY = (import.meta as any).env?.VITE_BLOCKFROST_KEY as string ?? '';

// The compiled Plutus V3 script for minting (same as useVoting.ts)
const COMPILED_SCRIPT = '5901b5010100229800aba2aba1aab9faab9eaab9dab9a9bae002488888896600264653001300800198041804800cdc3a400130080024888966002600460126ea800e2646644b300130050018acc004c034dd5003c00a2c80722b30013370e9001000c566002601a6ea801e00516403916402c80584c8cc8966002600c601a6ea80222b3001323300100137586022602460246024602400844b30010018a508acc004cdc79bae301200100d8a518998010011809800a01c404513300100225980099b8f375c601c0029110c564f54455f323032355f504800899b8848000dd69807800c528201a8a50403113300100225980099b8f375c601c00291010c564f54455f323032355f504800899b88375a601e00290004528201a40306464660020026eacc04000c8966002003003899192cc004cdc8803800c56600266e3c01c00626eacc04400a00a807a26600800860280068078dd718078009808800a02014bd6f7b630111919800800801912cc00400629462b3001300330120018998010011809800c528201c4044601c601c601c601c60166ea8008c028dd50029bae300c300a3754007164020300800130043754011149a26cac80101';

function hexAddressToBech32(hexAddr: string): string {
  const bytes = new Uint8Array(hexAddr.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  const words = bech32.toWords(bytes);
  return bech32.encode('addr_test', words, 1000);
}



/* OVERRIDE_START */
import { DEFAULT_V3_COST_MODEL_LIST } from '@meshsdk/common';
const CORRECT_350_LIST = [
  100788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59957, 4, 1, 11183, 32, 201305, 8356, 4, 16000, 100, 16000,
  100, 16000, 100, 16000, 100, 16000, 100, 16000, 100, 100, 100, 16000, 100, 94375, 32, 132994, 32,
  61462, 4, 72010, 178, 0, 1, 22151, 32, 91189, 769, 4, 2, 85848, 123203, 7305, -900, 1716, 960, 57,
  85848, 0, 1, 1, 1000, 42921, 4, 2, 30623, 28755, 75, 1, 898148, 27279, 1, 51775, 558, 1, 39184, 1000,
  60594, 1, 141895, 32, 83150, 32, 15299, 32, 76049, 1, 13169, 4, 22100, 10, 28999, 74, 1, 28999, 74, 1,
  43285, 552, 1, 44749, 541, 1, 33852, 32, 68246, 32, 72362, 32, 7243, 32, 7391, 32, 11546, 32, 85848,
  123203, 7305, -900, 1716, 960, 57, 85848, 0, 1, 90434, 519, 0, 1, 74433, 32, 85848, 123203, 7305, -900,
  1716, 960, 57, 85848, 0, 0, 1, 1, 85848, 123203, 7305, -900, 1716, 960, 57, 85848, 1, 955506, 213312,
  0, 2, 270652, 22588, 4, 1457325, 64566, 4, 20467, 1, 4, 0, 141992, 32, 100788, 420, 1, 1, 81663, 32,
  59498, 32, 20142, 32, 24588, 32, 20744, 32, 25933, 32, 24623, 32, 43053543, 10, 53384111, 14333, 10,
  43574283, 26308, 10, 16000, 100, 16000, 100, 962335, 18, 2780678, 6, 442008, 1, 52538055, 3756, 18,
  267929, 18, 76433006, 8868, 18, 52948122, 18, 1995836, 36, 3227919, 12, 901022, 1, 166917843, 4307, 36,
  284546, 36, 158221314, 26549, 36, 74698472, 36, 333849714, 1, 254006273, 72, 2174038, 72, 2261318,
  64571, 4, 207616, 8310, 4, 1293828, 28716, 63, 0, 1, 1006041, 43623, 251, 0, 1, 100181, 726, 719, 0, 1,
  100181, 726, 719, 0, 1, 100181, 726, 719, 0, 1, 107878, 680, 0, 1, 95336, 1, 281145, 18848, 0, 1, 180194,
  159, 1, 1, 158519, 8942, 0, 1, 159378, 8813, 0, 1, 107490, 3298, 1, 106057, 655, 1, 1964219, 24520, 3,
  607153, 231697, 53144, 0, 1, 116711, 1957, 4, 231883, 10, 1000, 24838, 7, 1, 232010, 32, 321837444,
  25087669, 18, 617887431, 67302824, 36, 356924, 18413, 45, 21, 219951, 9444, 1, 1000, 172116, 183150, 6,
  24, 21, 213283, 618401, 1998, 28258, 1, 1000, 38159, 2, 22, 1000, 95933, 1, 1, 11, 1000, 277577, 12, 21
];
if (DEFAULT_V3_COST_MODEL_LIST.length !== 350) {
  console.log('Dynamically overriding DEFAULT_V3_COST_MODEL_LIST with 350 elements...');
  DEFAULT_V3_COST_MODEL_LIST.length = 0;
  DEFAULT_V3_COST_MODEL_LIST.push(...CORRECT_350_LIST);
}
/* OVERRIDE_END */

export function DevMintPage() {
  const { wallet, isConnected } = useWallet();
  const [targetAddress, setTargetAddress] = useState('');
  const [status, setStatus] = useState<string>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMint = async () => {
    if (!wallet || !isConnected) {
      setError('Please connect your admin wallet first.');
      return;
    }
    const addressToMint = targetAddress.trim();

    if (!addressToMint || !addressToMint.startsWith('addr_test')) {
      setError('Please enter a valid Preview testnet address (addr_test...).');
      return;
    }

    try {
      // Validate that the target address is actually well-formed
      resolvePaymentKeyHash(addressToMint);
    } catch (err) {
      setError('Invalid target address format. Please ensure you copied the full address correctly.');
      return;
    }
    if (!BLOCKFROST_KEY) {
      setError('Missing VITE_BLOCKFROST_KEY in environment variables.');
      return;
    }

    setStatus('building');
    setError(null);
    setTxHash(null);

    try {
      console.log('Step 1: Initialize Provider');
      const provider = new BlockfrostProvider(BLOCKFROST_KEY);
      
      console.log('Step 2: Get Admin PKH');
      const adminAddress = await wallet.getChangeAddress();
      console.log('adminAddress:', adminAddress);
      
      const adminAddressBech32 = adminAddress.startsWith('addr')
        ? adminAddress
        : hexAddressToBech32(adminAddress);
      console.log('adminAddressBech32:', adminAddressBech32);
      
      let adminPubKeyHash;
      try {
        if (adminAddress.startsWith('addr')) {
          adminPubKeyHash = resolvePaymentKeyHash(adminAddress);
        } else {
          // CIP-30 wallets sometimes return the raw hex address.
          // For standard Shelley addresses, the first byte (2 hex chars) is the header,
          // and the next 28 bytes (56 hex chars) are the Payment Credential Hash.
          adminPubKeyHash = adminAddress.substring(2, 58);
        }
      } catch (e) {
        throw new Error(`Admin Address Error: Failed to parse admin address "${adminAddress}". Inner error: ${e instanceof Error ? e.message : e}`);
      }
      console.log('adminPubKeyHash:', adminPubKeyHash);
      
      console.log('Step 3: Apply params to script');
      let parameterizedScript;
      try {
        parameterizedScript = applyParamsToScript(
          COMPILED_SCRIPT,
          [adminPubKeyHash],
          "Mesh"
        );
      } catch (e) {
        throw new Error(`Script Parameterization Error: ${e instanceof Error ? e.message : e}`);
      }
      
      console.log('Step 3b: resolveScriptHash');
      const policyId = resolveScriptHash(parameterizedScript, "V3");
      const tokenNameHex = stringToHex("VOTE_2025_PH");
      const assetUnit = policyId + tokenNameHex;

      console.log('Step 4: Save to localStorage');
      // 4. Save to localStorage so useVoting/useWallet can read it for testing
      localStorage.setItem('DEV_ADMIN_PKH', adminPubKeyHash);
      localStorage.setItem('DEV_VOTE_POLICY_ID', policyId);

      console.log('Step 5: Init MeshTxBuilder');
      // 5. Build the transaction using MeshTxBuilder
      const txBuilder = new MeshTxBuilder({
        fetcher: provider,
        submitter: provider,
      });

      console.log('Step 5b: getUtxos');
      const utxos = await wallet.getUtxosMesh();
      if (!utxos || utxos.length === 0) {
        throw new Error("No UTXOs found in admin wallet.");
      }

      console.log('Step 5c: selectUtxosFrom');
      txBuilder.selectUtxosFrom(utxos);

      console.log('Step 5d: getCollateral');
      const collaterals = await wallet.getCollateralMesh();
      if (collaterals && collaterals.length > 0) {
        console.log('Step 5e: txInCollateral (from collaterals)');
        const col = collaterals[0];
        const colAddress = col.output?.address || adminAddressBech32;
        const colAmount = col.output?.amount || [{ unit: "lovelace", quantity: "5000000" }];
        
        txBuilder.txInCollateral(
          col.input.txHash,
          col.input.outputIndex,
          colAmount,
          colAddress
        );
      } else {
        console.log('Step 5e: txInCollateral (from pureAdaUtxo)');
        const pureAdaUtxo = utxos.find((u: any) => u.output && u.output.amount && u.output.amount.length === 1);
        if (pureAdaUtxo) {
          txBuilder.txInCollateral(
            pureAdaUtxo.input.txHash,
            pureAdaUtxo.input.outputIndex,
            pureAdaUtxo.output.amount,
            pureAdaUtxo.output.address
          );
        } else {
           throw new Error("No collateral available. Please enable collateral in wallet settings.");
        }
      }

      try {
        // Mint 1 token for the target wallet
        txBuilder
          .mintPlutusScriptV3()
          .mint("1", policyId, tokenNameHex)
          .mintingScript(parameterizedScript)
          .mintRedeemerValue(mConStr0([]));

        console.log('Step 7: txBuilder.txOut');
        txBuilder.txOut(addressToMint, [{ unit: assetUnit, quantity: "1" }]);

        console.log('Step 8: txBuilder.requiredSignerHash');
        txBuilder.requiredSignerHash(adminPubKeyHash);
        
        console.log('Step 9: txBuilder.changeAddress');
        txBuilder.changeAddress(adminAddressBech32);
      } catch (e) {
        throw new Error(`Transaction Building Error: ${e instanceof Error ? e.message : e}`);
      }

      console.log('Step 10: txBuilder.complete');
      setStatus('signing');
      let unsignedTx;
      try {
        unsignedTx = await txBuilder.complete();
      } catch (e) {
        throw new Error(`Transaction Complete Error: ${e instanceof Error ? e.message : e}`);
      }
      
      try {
        const { Serialization } = await import('@cardano-sdk/core');
        const txObj = Serialization.Transaction.fromCbor(unsignedTx as any);
        console.log('Unsigned transaction script data hash:', txObj.body().scriptDataHash());
      } catch (logErr) {
        console.log('Failed to parse unsigned transaction for hash logging:', logErr);
      }

      console.log('Step 11: wallet.signTx');
      const witnessSet = await wallet.signTx(unsignedTx, true);
      const fullSignedTx = BrowserWallet.addBrowserWitnesses(unsignedTx, witnessSet);

      try {
        const { Serialization } = await import('@cardano-sdk/core');
        const txObj = Serialization.Transaction.fromCbor(fullSignedTx as any);
        console.log('Signed transaction script data hash:', txObj.body().scriptDataHash());
      } catch (logErr) {
        console.log('Failed to parse signed transaction for hash logging:', logErr);
      }

      console.log('Step 12: provider.submitTx');
      const submittedHash = await provider.submitTx(fullSignedTx);
      
      setTxHash(submittedHash);
      setStatus('confirmed');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div>
            <h2 className="text-2xl font-heading font-bold text-text-primary">Developer Mint Tool</h2>
            <p className="text-sm text-text-secondary mt-1">
              Mint exactly 1 <span className="font-mono text-violet-300">VOTE_2025_PH</span> token to a target Preview testnet address. 
              The connected wallet acts as the Admin.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="targetAddress" className="block text-sm font-medium text-text-primary mb-1">
                Target Voter Address (Preview)
              </label>
              <input
                type="text"
                id="targetAddress"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="addr_test1..."
                className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>

            <button
              onClick={handleMint}
              disabled={(!isConnected) || (status !== 'idle' && status !== 'confirmed')}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!isConnected 
                ? 'Connect Wallet to Mint' 
                : status === 'idle' || status === 'confirmed' 
                  ? 'Mint Token' 
                  : `Minting (${status})...`}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm font-medium text-red-400">{error}</p>
            </div>
          )}

          {txHash && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl space-y-2">
              <p className="text-sm font-medium text-green-400 flex items-center gap-2">
                ✅ Minting Successful
              </p>
              <div className="bg-bg-elevated p-2 rounded-lg break-all">
                <span className="text-xs text-text-secondary">TxHash:</span><br/>
                <span className="text-xs font-mono text-green-300">{txHash}</span>
              </div>
              <p className="text-xs text-green-400/80">
                The Policy ID and Admin PKH have been automatically saved to localStorage so the burn mechanism works locally.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
