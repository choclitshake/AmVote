// frontend/src/hooks/useWallet.js
import { useWallet as useMeshWallet } from '@meshsdk/react';
import { useEffect, useState } from 'react';

export function useWallet() {
  const meshWallet = useMeshWallet();
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    const fetchAddress = async () => {
      if (meshWallet.connected && meshWallet.wallet) {
        const addr = await meshWallet.wallet.getChangeAddress();
        setWalletAddress(addr);
      }
    };
    fetchAddress();
  }, [meshWallet.connected, meshWallet.wallet]);

  return {
    isConnected: meshWallet.connected,
    address: walletAddress,
    wallet: meshWallet.wallet,
    connect: meshWallet.connect,
    disconnect: meshWallet.disconnect,
  };
}