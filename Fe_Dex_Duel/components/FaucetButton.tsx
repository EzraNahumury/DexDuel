"use client";

import { useFaucet } from "@/hooks/useFaucet";

export function FaucetButton({ address, onSuccess }: { address: string; onSuccess?: () => void }) {
  const { claimFaucet, isPending, isSuccess, isError, error } = useFaucet();

  async function handleClaim() {
    try {
      await claimFaucet(address);
      onSuccess?.();
    } catch {
      // Error is exposed by hook state below.
    }
  }

  if (isSuccess) {
    return (
      <span
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em]"
        style={{
          backgroundColor: "rgba(13,242,128,0.08)",
          color: "#0df280",
          border: "1px solid rgba(13,242,128,0.15)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
        Received
      </span>
    );
  }

  return (
    <div className="relative flex flex-col items-end gap-1">
      <button
        onClick={handleClaim}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-all duration-200 hover:bg-[#0df280]/10 active:scale-95 disabled:opacity-40"
        style={{
          backgroundColor: "rgba(13,242,128,0.04)",
          color: "#0df280",
          border: "1px solid rgba(13,242,128,0.15)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>water_drop</span>
        {isPending ? "Claiming..." : "Get 100 USDT"}
      </button>
      {isError && (
        <span className="absolute top-full z-[60] mt-1 whitespace-nowrap rounded-lg border border-red-500/15 bg-black/85 px-2 py-1 text-[10px] font-bold text-red-400 backdrop-blur-sm">
          {error?.message ?? "Faucet failed"}
        </span>
      )}
    </div>
  );
}
