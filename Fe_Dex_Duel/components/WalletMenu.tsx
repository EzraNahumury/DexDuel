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
        className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all"
        style={{
          background: "rgba(59,130,246,0.16)",
          color: "#e2e8f0",
          border: "1px solid rgba(59,130,246,0.42)",
          boxShadow:
            "0 10px 24px rgba(2,132,199,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <span className="material-symbols-outlined text-sm leading-none">
          account_balance_wallet
        </span>
        {currentAccountDisplay}
        <span className="material-symbols-outlined text-sm leading-none">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-xl overflow-hidden z-[100] shadow-2xl animate-fade-in-up"
          style={{
            background: "linear-gradient(135deg, #0b1220, #111b2f)",
            border: "1px solid rgba(59,130,246,0.25)",
          }}
        >
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
              Connected Wallet
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-300 truncate">{currentAccountDisplay}</p>
              {showCopy && (
                <button
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-all hover:bg-white/10"
                  style={{ color: copied ? "#22d3ee" : "#64748b" }}
                >
                  <span className="material-symbols-outlined text-xs leading-none">
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
          </div>

          {accounts.length > 1 && (
            <div className="px-3 py-2 border-b border-white/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 px-1">
                Switch Account
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {accounts.map((item) => {
                  const isActive =
                    normalizeAddress(item.address) === normalizeAddress(currentAccount.address);
                  return (
                    <button
                      key={item.address}
                      onClick={() => handleSwitchAccount(item.address)}
                      disabled={isActive || isSwitchingAccount}
                      className="w-full px-2 py-2 rounded-lg text-left text-xs font-bold flex items-center justify-between transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      style={
                        isActive
                          ? {
                              background:
                                "linear-gradient(135deg, rgba(59,130,246,0.22), rgba(34,211,238,0.16))",
                              color: "#67e8f9",
                            }
                          : {
                              backgroundColor: "rgba(255,255,255,0.03)",
                              color: "#cbd5e1",
                            }
                      }
                    >
                      <span className="truncate pr-2">
                        {formatAddress(item.address)}
                      </span>
                      <span className="material-symbols-outlined text-sm leading-none">
                        {isActive ? "check_circle" : "sync_alt"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {switchError && (
                <p className="text-[10px] text-red-400 font-bold mt-2 px-1">
                  {switchError}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleReconnectAndChoose}
            className="w-full px-4 py-3 flex items-center gap-2 text-sm font-bold hover:bg-white/5 transition-colors text-left border-b border-white/10"
          >
            <span
              className="material-symbols-outlined text-base leading-none"
              style={{ color: "#f59e0b" }}
            >
              restart_alt
            </span>
            <span style={{ color: "#f59e0b" }}>Reconnect & Choose Account</span>
          </button>

          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-3 flex items-center gap-2 text-sm font-bold hover:bg-white/5 transition-colors text-left"
          >
            <span
              className="material-symbols-outlined text-base leading-none"
              style={{ color: "#ff4d4d" }}
            >
              logout
            </span>
            <span style={{ color: "#ff4d4d" }}>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
}
