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
        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
        style={{ backgroundColor: "rgba(13,242,128,0.15)", color: "#0df280", border: "1px solid rgba(13,242,128,0.2)" }}
      >
        <span className="material-symbols-outlined text-sm leading-none">check_circle</span>
        Received
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClaim}
        disabled={isPending}
        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:bg-white/5 active:scale-95 disabled:opacity-50 border border-white/10"
        style={{
          backgroundColor: "rgba(13,242,128,0.05)",
          color: "#0df280",
          borderColor: "rgba(13,242,128,0.2)",
        }}
      >
        <span className="material-symbols-outlined text-sm leading-none">water_drop</span>
        {isPending ? "Claiming..." : "Get 100 USDT"}
      </button>
      {isError && (
        <span className="absolute top-full mt-1 text-[10px] font-bold text-red-400 bg-black/80 px-2 py-1 rounded backdrop-blur-sm border border-red-500/20 whitespace-nowrap z-[60]">
          {error?.message ?? "Faucet failed"}
        </span>
      )}
    </div>
  );
}
