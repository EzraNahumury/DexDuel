"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAccounts,
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useSwitchAccount,
} from "@onelabs/dapp-kit";

interface WalletMenuProps {
  showCopy?: boolean;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function WalletMenu({ showCopy = true }: WalletMenuProps) {
  const account = useCurrentAccount();
  const accountsFromStore = useAccounts();
  const { currentWallet } = useCurrentWallet();
  const walletAccounts = currentWallet?.accounts ?? [];
  const accounts =
    walletAccounts.length > 0 ? walletAccounts : accountsFromStore;
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutateAsync: switchAccount, isPending: isSwitchingAccount } = useSwitchAccount();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!account) return null;
  const currentAccount = account;

  function handleCopy() {
    navigator.clipboard.writeText(currentAccount.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSwitchAccount(address: string) {
    const normalizedTargetAddress = normalizeAddress(address);
    const target = accounts.find(
      (item) => normalizeAddress(item.address) === normalizedTargetAddress,
    );
    if (!target) {
      setSwitchError("Selected account is not available in this wallet session.");
      return;
    }
    setSwitchError(null);
    try {
      await switchAccount({ account: target });
      setOpen(false);
    } catch (error) {
      setSwitchError(
        error instanceof Error ? error.message : "Failed to switch account.",
      );
    }
  }

  function handleDisconnect() {
    disconnect();
    setOpen(false);
    router.push("/");
  }

  function handleReconnectAndChoose() {
    disconnect();
    setOpen(false);
    router.push("/");
  }

  const currentAccountDisplay = formatAddress(currentAccount.address);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all duration-200 hover:bg-white/[0.06]"
        style={{
          background: "rgba(255,255,255,0.04)",
          color: "#cbd5e1",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#60a5fa" }}>
          account_balance_wallet
        </span>
        <span className="tabular-nums">{currentAccountDisplay}</span>
        <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 14 }}>
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-[100] mt-2 w-72 overflow-hidden rounded-2xl animate-fade-in-up"
          style={{
            background: "rgba(10,15,28,0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.03) inset",
          }}
        >
          {/* Connected wallet */}
          <div className="border-b border-white/[0.05] px-4 py-3.5">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
              Connected Wallet
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-mono text-xs font-semibold text-slate-300">{currentAccountDisplay}</p>
              {showCopy && (
                <button
                  onClick={handleCopy}
                  className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all hover:bg-white/[0.06]"
                  style={{ color: copied ? "#22d3ee" : "#475569" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          </div>

          {/* Switch accounts */}
          {accounts.length > 1 && (
            <div className="border-b border-white/[0.05] px-3 py-3">
              <p className="mb-2 px-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
                Switch Account
              </p>
              <div className="max-h-40 space-y-0.5 overflow-y-auto">
                {accounts.map((item) => {
                  const isActive =
                    normalizeAddress(item.address) === normalizeAddress(currentAccount.address);
                  return (
                    <button
                      key={item.address}
                      onClick={() => handleSwitchAccount(item.address)}
                      disabled={isActive || isSwitchingAccount}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        color: isActive ? "#67e8f9" : "#94a3b8",
                        background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                      }}
                    >
                      <span className="truncate pr-2 font-mono">{formatAddress(item.address)}</span>
                      <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14 }}>
                        {isActive ? "check_circle" : "sync_alt"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {switchError && (
                <p className="mt-2 px-1 text-[10px] font-bold text-red-400">{switchError}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="p-1.5">
            <button
              onClick={handleReconnectAndChoose}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-bold transition-all hover:bg-white/[0.04]"
              style={{ color: "#f59e0b" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restart_alt</span>
              Reconnect & Choose
            </button>
            <button
              onClick={handleDisconnect}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-bold transition-all hover:bg-white/[0.04]"
              style={{ color: "#f87171" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
