import { useState, useRef, useEffect } from 'react';
import { useWallet as useMeshWallet } from '@meshsdk/react';
import { useWallet } from '../hooks/useWallet';
import { supportedWallets } from '../lib/mesh-config';

const walletMeta: Record<string, { label: string; icon: string; desc: string }> = {
  eternl:   { label: 'Eternl',   icon: '🌙', desc: 'Feature-rich power wallet' },
  lace:     { label: 'Lace',     icon: '💎', desc: 'Sleek, light wallet by IOG' },
  metamask: { label: 'MetaMask', icon: '🦊', desc: 'EVM compatible (obsolete)' },
};

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 20) return addr;
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
}

export function WalletConnect({ compact = false }: { compact?: boolean }) {
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

  // Filter out metamask since we're using Cardano
  const activeWallets = supportedWallets.filter(w => w !== 'metamask');

  // ── Connected state ──────────────────────────────────────
  if (connected) {
    const wrongNetwork = networkId !== null && networkId !== 0;

    if (!compact) {
      return (
        <div className="space-y-4">
          <div className="glass-card p-5 border-green-500/25 bg-green-500/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] shrink-0" />
              <div>
                <p className="text-xs font-body font-medium text-green-400">Wallet Connected</p>
                <p className="font-mono text-sm text-text-primary mt-0.5">{truncateAddress(address)}</p>
              </div>
            </div>
            <button
              onClick={() => disconnect()}
              className="text-xs text-text-muted hover:text-red-400 font-body transition-colors py-1.5 px-3 rounded-lg border border-bg-border hover:bg-red-500/10"
            >
              Disconnect
            </button>
          </div>
          {wrongNetwork && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400 font-body flex items-center gap-2">
              Wrong network — please switch to Cardano Preview Testnet
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        {wrongNetwork && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-body font-medium bg-red-500/15 text-red-400 border border-red-500/30">
            Wrong Net
          </span>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-border hover:border-violet-500/50 text-xs font-body"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
            <span className="font-mono text-violet-300">
              {truncateAddress(address)}
            </span>
            <span className="text-xs">
              {walletMeta[name || '']?.icon || '🔗'}
            </span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-bg-elevated border border-bg-border rounded-xl shadow-card overflow-hidden z-50">
              <div className="p-3 border-b border-bg-border">
                <p className="text-xs text-text-muted font-body">Connected wallet</p>
                <p className="text-[10px] text-violet-300 font-mono mt-0.5 break-all">{address}</p>
              </div>
              <button
                onClick={() => { disconnect(); setShowDropdown(false); }}
                className="w-full px-3 py-2 text-left text-xs font-body text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Disconnected state (GRID CARDS) ──────────────────────
  if (!compact) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {activeWallets.map(walletName => {
          const meta = walletMeta[walletName];
          return (
            <button
              key={walletName}
              onClick={() => handleConnect(walletName)}
              className="glass-card glass-card-hover p-5 flex flex-col items-center text-center gap-3 transition-all duration-200"
            >
              <span className="text-4xl filter drop-shadow-md">{meta?.icon || '🔗'}</span>
              <div>
                <p className="font-heading font-bold text-sm text-text-primary">{meta?.label || walletName}</p>
                <p className="text-[10px] text-text-muted font-body mt-1 leading-relaxed">{meta?.desc || 'Connect'}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Disconnected state (COMPACT DROPDOWN) ─────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="btn-violet !py-2 !px-4 !text-xs"
      >
        Connect Wallet
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-52 bg-bg-elevated border border-bg-border rounded-xl shadow-card overflow-hidden z-50 animate-scale-in">
          <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-text-muted font-body border-b border-bg-border">
            Select Wallet
          </p>
          {activeWallets.map(walletName => {
            const meta = walletMeta[walletName];
            return (
              <button
                key={walletName}
                onClick={() => handleConnect(walletName)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-violet-500/10 transition-colors text-left"
              >
                <span className="text-lg">{meta?.icon || '🔗'}</span>
                <span className="font-body text-xs text-text-primary font-medium">{meta?.label || walletName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}