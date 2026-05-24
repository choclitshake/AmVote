import { useState, useRef, useEffect } from 'react';
import { useWallet as useMeshWallet } from '@meshsdk/react';
import { useWallet } from '../hooks/useWallet';
import { supportedWallets } from '../lib/mesh-config';

const walletMeta: Record<string, { label: string; icon: string }> = {
  eternl:   { label: 'Eternl',   icon: '🌙' },
  lace:     { label: 'Lace',     icon: '💎' },
  metamask: { label: 'MetaMask', icon: '🦊' },
};

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 20) return addr;
  return `${addr.slice(0, 12)}...${addr.slice(-6)}`;
}

export function WalletConnect() {
  const { connect, disconnect, connected, name } = useMeshWallet();
  const { address, networkId } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleConnect = async (walletName: string) => {
    try {
      await connect(walletName);
      setShowDropdown(false);
    } catch (err) {
      console.error('[WalletConnect] Failed to connect:', err);
    }
  };

  // ── Connected state ──────────────────────────────────────
  if (connected) {
    const wrongNetwork = networkId !== null && networkId !== 0;

    return (
      <div className="flex items-center gap-3">
        {/* Status badges */}
        <div className="flex items-center gap-2">
          {wrongNetwork && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body font-medium bg-red-500/15 text-red-400 border border-red-500/30">
              ⚠ Wrong Network
            </span>
          )}
        </div>

        {/* Address + wallet info */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border hover:border-violet-500/50 transition-all duration-200"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
            <span className="font-mono text-sm text-violet-300">
              {truncateAddress(address)}
            </span>
            <span className="text-text-muted text-xs">
              {walletMeta[name || '']?.icon || '🔗'}
            </span>
            <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-bg-elevated border border-bg-border rounded-xl shadow-card overflow-hidden z-50">
              <div className="p-3 border-b border-bg-border">
                <p className="text-xs text-text-muted font-body">Connected as</p>
                <p className="text-xs text-violet-300 font-mono mt-0.5 break-all">{address}</p>
              </div>
              <button
                onClick={() => { disconnect(); setShowDropdown(false); }}
                className="w-full px-3 py-2.5 text-left text-sm font-body text-red-400 hover:bg-red-500/10 transition-all duration-200"
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Disconnected state ───────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-5 py-2.5 rounded-xl font-heading font-semibold text-sm text-white bg-violet-500 hover:bg-violet-400 transition-all duration-200 shadow-violet-glow hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
      >
        Connect Wallet
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 bg-bg-elevated border border-bg-border rounded-xl shadow-card overflow-hidden z-50">
          <p className="px-3 py-2 text-xs text-text-muted font-body border-b border-bg-border">
            Select a wallet
          </p>
          {supportedWallets
            .filter(w => w !== 'metamask') // MetaMask doesn't support Cardano
            .map(walletName => {
              const meta = walletMeta[walletName];
              return (
                <button
                  key={walletName}
                  onClick={() => handleConnect(walletName)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-violet-500/10 transition-all duration-200"
                >
                  <span className="text-xl">{meta?.icon || '🔗'}</span>
                  <span className="font-body text-sm text-text-primary">{meta?.label || walletName}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}