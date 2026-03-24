"use client";

import { useState, useEffect, useCallback } from "react";
import type { OnChainRound } from "@/src/types/onechain";

interface UseRoundDetailResult {
  round: OnChainRound | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * useRoundDetail — fetches a single round detail by its Object Address.
 */
export function useRoundDetail(roundAddress: string | null): UseRoundDetailResult {
  const [round, setRound] = useState<OnChainRound | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!roundAddress) return;
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch(`/api/tournaments/${encodeURIComponent(roundAddress!)}`);
        const data = await r.json();
        if (!cancelled) {
          if (data.ok) setRound(data.data);
          else setError(data.error ?? "Not found");
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    setIsLoading(true);
    setError(null);
    load();

    return () => {
      cancelled = true;
    };
  }, [roundAddress, tick]);

  return { round, isLoading, error, refetch };
}
