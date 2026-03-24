"use client";

import { useEffect, useRef, useState } from "react";
import type { WalletAccount } from "@onelabs/wallet-standard";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSwitchAccount,
} from "@onelabs/dapp-kit";

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AccountSelectionGate() {
  const { connectionStatus, currentWallet } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const walletAccounts = currentWallet?.accounts ?? [];
  const accounts = walletAccounts.length > 0 ? walletAccounts : [];
  const { mutateAsync: switchAccount, isPending: isSwitching } = useSwitchAccount();

  const previousStatus = useRef(connectionStatus);
  const [promptAfterConnect, setPromptAfterConnect] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function deferStateUpdate(callback: () => void) {
    Promise.resolve().then(callback);
  }

  useEffect(() => {
    const prev = previousStatus.current;
    if (prev !== "connected" && connectionStatus === "connected") {
      deferStateUpdate(() => setPromptAfterConnect(true));
    }
    if (connectionStatus === "disconnected") {
      deferStateUpdate(() => {
        setOpen(false);
        setPromptAfterConnect(false);
        setError(null);
      });
    }
    previousStatus.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    if (!promptAfterConnect) return;
    if (accounts.length <= 1) {
      deferStateUpdate(() => setPromptAfterConnect(false));
      return;
    }

    deferStateUpdate(() => {
      setOpen(true);
      setPromptAfterConnect(false);
    });
  }, [promptAfterConnect, accounts.length]);

  async function handleChooseAccount(target: WalletAccount) {
    setError(null);
    try {
      await switchAccount({ account: target });
      setOpen(false);
    } catch (switchError) {
      setError(
        switchError instanceof Error
          ? switchError.message
          : "Failed to switch account.",
      );
    }
  }

  if (!open || accounts.length <= 1) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5"
        style={{ backgroundColor: "#121a16", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <h3 className="text-lg font-black uppercase tracking-wider mb-1">
          Choose Wallet Account
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Select address that will be used in this session.
        </p>

        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {accounts.map((account) => {
            const isCurrent = currentAccount?.address === account.address;
            return (
              <button
                key={account.address}
                onClick={() => handleChooseAccount(account)}
                disabled={isCurrent || isSwitching}
                className="w-full px-3 py-3 rounded-xl flex items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-70"
                style={
                  isCurrent
                    ? {
                        backgroundColor: "rgba(13,242,128,0.14)",
                        border: "1px solid rgba(13,242,128,0.4)",
                        color: "#0df280",
                      }
                    : {
                        backgroundColor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#e2e8f0",
                      }
                }
              >
                <div>
                  <p className="text-sm font-bold font-mono">
                    {formatAddress(account.address)}
                  </p>
                  {account.label && (
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {account.label}
                    </p>
                  )}
                </div>
                <span className="material-symbols-outlined text-base leading-none">
                  {isCurrent ? "check_circle" : "arrow_forward"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#cbd5e1" }}
          >
            Use Current Account
          </button>
        </div>

        {error && (
          <p className="text-[11px] text-red-400 font-bold mt-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
