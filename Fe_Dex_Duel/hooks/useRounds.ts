"use client";

import { useState, useEffect, useCallback } from "react";
import type { OnChainRound } from "@/src/types/onechain";

interface UseRoundsResult {
  rounds: OnChainRound[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * useRounds — fetches all rounds from /api/rounds (which reads from DB).
 */
export function useRounds(): UseRoundsResult {
  const [rounds, setRounds] = useState<OnChainRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch("/api/rounds");
        const data = await r.json();
        if (!cancelled) setRounds(data.rounds ?? []);
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
  }, [tick]);

  return { rounds, isLoading, error, refetch };
}
