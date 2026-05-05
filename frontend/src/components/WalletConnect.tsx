import { useWallet } from '@meshsdk/react';

export function WalletConnect() {
  const { connected, connect, disconnect, name } = useWallet();

  if (connected) {
    return (
      <div className="flex items-center gap-4">
        <span>Connected: {name}</span>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <button onClick={() => connect('eternl')} className="bg-blue-500 text-white px-4 py-2">
      Connect Wallet
    </button>
  );
}