"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ConnectButton, useCurrentAccount } from "@onelabs/dapp-kit";
import { useCreateTournament } from "@/hooks/useCreateTournament";
import { toFinnhubSymbol, useMarketSymbols } from "@/hooks/useMarketData";
import { useOnChainTournaments, useRoundJoinEvents, type OnChainTournament } from "@/hooks/useOnChainTournaments";
import { useCancelTournament } from "@/hooks/useCancelTournament";
import { useStartRound } from "@/hooks/useStartRound";
import { useCompleteGame } from "@/hooks/useCompleteGame";
import { useSettleGame } from "@/hooks/useSettleGame";
import { useLeaderboardRows } from "@/hooks/useLeaderboard";
import { buildTournamentGroup, type TournamentGroup } from "@/lib/tournamentGroup";
import { EXPLORER_BASE, isCreateTournamentAdmin, formatUSDT } from "@/lib/constants";

// ── Form state ──────────────────────────────────────────────────────
type FormState = {
  seasonId: string;
  coinSymbol: string;
  entryFeeRaw: string;
  minParticipants: string;
  startTime: string;
  totalRounds: string;
  roundDurationMinutes: string;
  gapMinutes: string;
  earlyWindowMinutes: string;
};

function toInputDate(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function initialFormState(): FormState {
  const now = new Date();
  const start = new Date(now.getTime() + 10 * 60_000);
  return {
    seasonId: String(Date.now()).slice(-4),
    coinSymbol: "BTC",
    entryFeeRaw: "100000000",
    minParticipants: "1",
    startTime: toInputDate(start),
    totalRounds: "3",
    roundDurationMinutes: "5",
    gapMinutes: "2",
    earlyWindowMinutes: "3",
  };
}

function parseDateInput(v: string): number {
  return new Date(v).getTime();
}

function formatDateTime(ts: number): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

// ── Reusable UI components ──────────────────────────────────────────
function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-slate-500 font-medium">{hint}</span>}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string }> = {
    live: { color: "#14b8a6", bg: "rgba(20,184,166,0.18)" },
    upcoming: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
    cancelled: { color: "#fb7185", bg: "rgba(244,63,94,0.16)" },
    ended: { color: "#cbd5e1", bg: "rgba(148,163,184,0.16)" },
  };
  const c = cfg[status] ?? cfg.ended;
  return (
    <span
      className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-[0.12em]"
      style={{ color: c.color, backgroundColor: c.bg }}
    >
      {status}
    </span>
  );
}

function AlertBox({ type, children }: { type: "error" | "success" | "warning"; children: React.ReactNode }) {
  const cfg = {
    error: { color: "#fecaca", bg: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.28)", icon: "error" },
    success: { color: "#5eead4", bg: "rgba(20,184,166,0.1)", border: "rgba(20,184,166,0.3)", icon: "check_circle" },
    warning: { color: "#fde68a", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", icon: "warning" },
  }[type];
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3 text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <span className="material-symbols-outlined text-base shrink-0">{cfg.icon}</span>
      <span>{children}</span>
    </div>
  );
}

// ── Fetch live price ────────────────────────────────────────────────
async function getLiveStartPriceRaw(symbol: string): Promise<number> {
  const marketSymbol = toFinnhubSymbol(symbol);
  const response = await fetch(
    `/api/market/quote?symbol=${encodeURIComponent(marketSymbol)}`,
    { cache: "no-store" },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to fetch live price.");
  }
  const currentPrice = Number(payload?.c);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    throw new Error("Invalid live price from market feed.");
  }
  return Math.floor(currentPrice * 100_000_000);
}

/**
 * Fetch the historical end price for a round via /api/rounds/price.
 * Falls back to live price only if historical data is unavailable.
 */
async function getRoundEndPriceRaw(
  coinSymbol: string,
  roundObjectId: string,
  endTimeMs: number,
  priceStart: number,
): Promise<number> {
  const symbol = toFinnhubSymbol(coinSymbol);

  // 1. Try historical price
  try {
    const params = new URLSearchParams({
      roundObjectId,
      symbol,
      coinSymbol,
      endTimeMs: String(endTimeMs),
      priceStart: String(priceStart),
    });
    const response = await fetch(`/api/rounds/price?${params}`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (data.priceEnd != null && data.priceEnd > 0) {
        return Math.floor(data.priceEnd * 100_000_000);
      }
    }
  } catch { /* fall through */ }

  // 2. Fallback: live price
  return getLiveStartPriceRaw(coinSymbol);
}

// ── Main page ────────────────────────────────────────────────────────
export default function CreateTournamentPage() {
  const account = useCurrentAccount();
  const isAdmin = isCreateTournamentAdmin(account?.address);
  const [form, setForm] = useState<FormState>(() => initialFormState());
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [createLog, setCreateLog] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  type TxState = { message: string | null; txDigest: string | null; isError: boolean };
  type CompleteFormState = { priceEndRaw: string; rank1: string; rank2: string; rank3: string };

  const [startStateByRound, setStartStateByRound] = useState<Record<string, TxState>>({});
  const [cancelStateByRound, setCancelStateByRound] = useState<Record<string, TxState>>({});
  const [completeFormByRound, setCompleteFormByRound] = useState<Record<string, CompleteFormState>>({});
  const [completeStateByRound, setCompleteStateByRound] = useState<Record<string, TxState>>({});
  const [settleStateByRound, setSettleStateByRound] = useState<Record<string, TxState>>({});
  const [autoFinalizeLog, setAutoFinalizeLog] = useState<string[]>([]);
  const autoFinalizeInProgress = useRef<Set<string>>(new Set());

  const { createTournament, batchCreateTournament, isPending, isSuccess, isError, error } = useCreateTournament();
  const { startRound, batchStartRounds, isPending: isStartPending, reset: resetStartRound } = useStartRound();
  const { cancelTournament, isPending: isCancelPending, reset: resetCancelTournament } = useCancelTournament();
  const { completeGame } = useCompleteGame();
  const { settleGame } = useSettleGame();

  const symbolsQuery = useMarketSymbols("BINANCE", "USDT");
  const availableSymbols = useMemo(() => symbolsQuery.data ?? [], [symbolsQuery.data]);
  const tournamentsQuery = useOnChainTournaments();
  const tournaments = useMemo(() => tournamentsQuery.data ?? [], [tournamentsQuery.data]);
  const joinEventsQuery = useRoundJoinEvents();
  const leaderboardQuery = useLeaderboardRows();

  const selectedCoinSymbol = useMemo(() => {
    const current = form.coinSymbol.toUpperCase();
    if (availableSymbols.includes(current)) return current;
    return availableSymbols[0] ?? current;
  }, [availableSymbols, form.coinSymbol]);

  const myTournaments = useMemo(() => {
    if (!account?.address) return [];
    const normalized = account.address.toLowerCase();
    return tournaments.filter(
      (t) => t.creatorAddress.toLowerCase() === normalized && t.status !== "cancelled",
    );
  }, [tournaments, account]);

  // Group my tournaments by seasonId
  const myTournamentGroups = useMemo((): TournamentGroup[] => {
    const bySeasonId = new Map<number, OnChainTournament[]>();
    for (const r of myTournaments) {
      const list = bySeasonId.get(r.seasonId) ?? [];
      list.push(r);
      bySeasonId.set(r.seasonId, list);
    }
    return Array.from(bySeasonId.entries())
      .map(([sId, rounds]) => buildTournamentGroup(sId, rounds))
      .filter((g): g is TournamentGroup => g !== null)
      .sort((a, b) => b.prizeRound.startTimeMs - a.prizeRound.startTimeMs);
  }, [myTournaments]);

  const validation = useMemo(() => {
    const seasonId = Number(form.seasonId);
    const entryFeeRaw = Number(form.entryFeeRaw);
    const minParticipants = Number(form.minParticipants);
    const earlyWindowMinutes = Number(form.earlyWindowMinutes);
    const totalRounds = Number(form.totalRounds);
    const roundDurationMinutes = Number(form.roundDurationMinutes);
    const gapMinutes = Number(form.gapMinutes);
    const startTimeMs = parseDateInput(form.startTime);
    if (!Number.isFinite(seasonId) || seasonId <= 0) return "Season ID must be > 0";
    if (!form.coinSymbol.trim()) return "Coin symbol required";
    if (!Number.isFinite(entryFeeRaw) || entryFeeRaw <= 0) return "Entry fee must be > 0";
    if (!Number.isFinite(minParticipants) || minParticipants <= 0) return "Min participants must be > 0";
    if (!Number.isFinite(earlyWindowMinutes) || earlyWindowMinutes < 0) return "Early window must be >= 0";
    if (!Number.isFinite(totalRounds) || totalRounds < 1 || totalRounds > 10) return "Total rounds: 1–10";
    if (!Number.isFinite(roundDurationMinutes) || roundDurationMinutes < 1) return "Round duration >= 1 min";
    if (!Number.isFinite(gapMinutes) || gapMinutes < 0) return "Gap must be >= 0";
    if (!Number.isFinite(startTimeMs)) return "Valid start time required";
    return null;
  }, [form]);

  // Preview round schedule
  const roundSchedule = useMemo(() => {
    const totalRounds = Number(form.totalRounds);
    const durationMs = Number(form.roundDurationMinutes) * 60_000;
    const gapMs = Number(form.gapMinutes) * 60_000;
    const startMs = parseDateInput(form.startTime);
    if (!Number.isFinite(startMs) || totalRounds < 1) return [];
    return Array.from({ length: totalRounds }, (_, i) => {
      const roundStart = startMs + i * (durationMs + gapMs);
      const roundEnd = roundStart + durationMs;
      return { roundIndex: i + 1, startMs: roundStart, endMs: roundEnd };
    });
  }, [form.totalRounds, form.roundDurationMinutes, form.gapMinutes, form.startTime]);

  function setCompleteForm(roundId: string, patch: Partial<CompleteFormState>) {
    setCompleteFormByRound((prev) => {
      const existing = prev[roundId] ?? { priceEndRaw: "", rank1: "", rank2: "", rank3: "" };
      return { ...prev, [roundId]: { ...existing, ...patch } };
    });
  }

  async function handleAutoFetchEndPrice(roundObjectId: string, coinSymbol: string) {
    setCompleteForm(roundObjectId, { priceEndRaw: "Fetching…" });
    try {
      const priceRaw = await getLiveStartPriceRaw(coinSymbol);
      setCompleteForm(roundObjectId, { priceEndRaw: String(priceRaw) });
    } catch {
      setCompleteForm(roundObjectId, { priceEndRaw: "" });
    }
  }

  async function handleCompleteGame(tournament: OnChainTournament) {
    if (!account || !isAdmin || !tournament.leaderboardId) return;
    const formData = completeFormByRound[tournament.roundObjectId];
    const priceEndRaw = Number(formData?.priceEndRaw);
    if (!Number.isFinite(priceEndRaw) || priceEndRaw <= 0) return;
    const top3 = [formData?.rank1 ?? "", formData?.rank2 ?? "", formData?.rank3 ?? ""]
      .map((a) => a.trim())
      .filter((a) => a.startsWith("0x") && a.length >= 10);
    setCompleteStateByRound((p) => ({
      ...p,
      [tournament.roundObjectId]: { message: "Submitting…", txDigest: null, isError: false },
    }));
    try {
      const result = await completeGame({
        sessionId: tournament.sessionId,
        roundId: tournament.roundObjectId,
        registryId: tournament.registryId,
        leaderboardId: tournament.leaderboardId,
        priceEndRaw,
        top3Players: top3,
      });
      setCompleteStateByRound((p) => ({
        ...p,
        [tournament.roundObjectId]: {
          message: "Game completed!",
          txDigest: (result as { digest?: string }).digest ?? null,
          isError: false,
        },
      }));
      await tournamentsQuery.refetch();
    } catch (err) {
      setCompleteStateByRound((p) => ({
        ...p,
        [tournament.roundObjectId]: {
          message: err instanceof Error ? err.message : "Failed to complete.",
          txDigest: null,
          isError: true,
        },
      }));
    }
  }

  async function handleSettleGame(tournament: OnChainTournament) {
    if (!account || !isAdmin) return;
    setSettleStateByRound((p) => ({
      ...p,
      [tournament.roundObjectId]: { message: "Submitting…", txDigest: null, isError: false },
    }));
    try {
      const result = await settleGame({ roundId: tournament.roundObjectId });
      setSettleStateByRound((p) => ({
        ...p,
        [tournament.roundObjectId]: {
          message: "Game settled! Prizes locked.",
          txDigest: (result as { digest?: string }).digest ?? null,
          isError: false,
        },
      }));
      await tournamentsQuery.refetch();
    } catch (err) {
      setSettleStateByRound((p) => ({
        ...p,
        [tournament.roundObjectId]: {
          message: err instanceof Error ? err.message : "Failed to settle.",
          txDigest: null,
          isError: true,
        },
      }));
    }
  }

  async function handleStartTournament(roundObjectId: string, coinSymbol: string) {
    if (!account || !isAdmin) return;
    resetStartRound();
    setStartStateByRound((p) => ({
      ...p,
      [roundObjectId]: { message: "Fetching live price…", txDigest: null, isError: false },
    }));
    try {
      const priceStartRaw = await getLiveStartPriceRaw(coinSymbol);
      setStartStateByRound((p) => ({
        ...p,
        [roundObjectId]: { message: "Submitting transaction…", txDigest: null, isError: false },
      }));
      const result = await startRound({ roundId: roundObjectId, priceStartRaw });
      setStartStateByRound((p) => ({
        ...p,
        [roundObjectId]: {
          message: `Round started at $${(priceStartRaw / 1e8).toFixed(2)}`,
          txDigest: result.digest ?? null,
          isError: false,
        },
      }));
      await tournamentsQuery.refetch();
    } catch (executionError) {
      setStartStateByRound((p) => ({
        ...p,
        [roundObjectId]: {
          message: executionError instanceof Error ? executionError.message : "Failed to start.",
          txDigest: null,
          isError: true,
        },
      }));
    }
  }

  const [startAllState, setStartAllState] = useState<Record<number, { message: string | null; isError: boolean }>>({});

  /**
   * Start Tournament: only start the FIRST upcoming round.
   * Subsequent rounds are auto-started by the polling loop when their scheduled time arrives.
   */
  async function handleStartTournamentGroup(group: TournamentGroup) {
    if (!account || !isAdmin) return;
    resetStartRound();

    const upcomingRounds = group.rounds
      .filter((r) => r.status === "upcoming")
      .sort((a, b) => a.startTimeMs - b.startTimeMs);

    if (upcomingRounds.length === 0) return;

    const firstRound = upcomingRounds[0];
    const seasonId = group.seasonId;
    setStartAllState((prev) => ({ ...prev, [seasonId]: { message: "Fetching live price…", isError: false } }));
    setStartStateByRound((p) => ({
      ...p,
      [firstRound.roundObjectId]: { message: "Starting…", txDigest: null, isError: false },
    }));

    try {
      const priceStartRaw = await getLiveStartPriceRaw(group.coinSymbol);
      setStartAllState((prev) => ({ ...prev, [seasonId]: { message: "Submitting transaction…", isError: false } }));

      await startRound({ roundId: firstRound.roundObjectId, priceStartRaw });

      const msg = `Round 1 started at $${(priceStartRaw / 1e8).toFixed(2)} — next rounds will auto-start on schedule`;
      setStartAllState((prev) => ({ ...prev, [seasonId]: { message: msg, isError: false } }));
      setStartStateByRound((p) => ({
        ...p,
        [firstRound.roundObjectId]: {
          message: `Started at $${(priceStartRaw / 1e8).toFixed(2)}`,
          txDigest: null,
          isError: false,
        },
      }));
      await tournamentsQuery.refetch();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to start.";
      setStartAllState((prev) => ({ ...prev, [seasonId]: { message: errMsg, isError: true } }));
      setStartStateByRound((p) => ({
        ...p,
        [firstRound.roundObjectId]: { message: errMsg, txDigest: null, isError: true },
      }));
    }
  }

  async function handleCancelTournament(sessionId: string, roundObjectId: string) {
    if (!account || !isAdmin) return;
    resetCancelTournament();
    setCancelStateByRound((p) => ({
      ...p,
      [roundObjectId]: { message: "Submitting…", txDigest: null, isError: false },
    }));
    try {
      const result = await cancelTournament({ sessionId, roundId: roundObjectId });
      setCancelStateByRound((p) => ({
        ...p,
        [roundObjectId]: {
          message: "Cancelled.",
          txDigest: result.digest ?? null,
          isError: false,
        },
      }));
      await tournamentsQuery.refetch();
    } catch (executionError) {
      setCancelStateByRound((p) => ({
        ...p,
        [roundObjectId]: {
          message: executionError instanceof Error ? executionError.message : "Failed to cancel.",
          txDigest: null,
          isError: true,
        },
      }));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !isAdmin || validation) return;

    const totalRounds = Number(form.totalRounds);
    const durationMs = Number(form.roundDurationMinutes) * 60_000;
    const gapMs = Number(form.gapMinutes) * 60_000;
    const startMs = parseDateInput(form.startTime);
    const seasonId = Number(form.seasonId);
    const coinSymbol = selectedCoinSymbol;
    const entryFeeRaw = Number(form.entryFeeRaw);
    const minParticipants = Number(form.minParticipants);
    const earlyWindowMinutes = Number(form.earlyWindowMinutes);

    setCreateLog([`Creating ${totalRounds} rounds for Season ${seasonId} in a single transaction…`]);

    const roundsParams = Array.from({ length: totalRounds }, (_, i) => {
      const roundStart = startMs + i * (durationMs + gapMs);
      const roundEnd = roundStart + durationMs;
      const roundEntryFee = i === 0 ? entryFeeRaw : 1; // Round 1 = prize, rest = free
      const roundId = Date.now() + i;

      setCreateLog((prev) => [
        ...prev,
        `Round ${i + 1}/${totalRounds}: fee ${i === 0 ? formatUSDT(roundEntryFee) + " USDT" : "free"}`,
      ]);

      return {
        roundId,
        seasonId,
        coinSymbol,
        startTimeMs: roundStart,
        endTimeMs: roundEnd,
        entryFeeRaw: roundEntryFee,
        minParticipants,
        earlyWindowMinutes,
      };
    });

    try {
      const result = await batchCreateTournament(roundsParams);
      setCreateLog((prev) => [
        ...prev,
        `All ${totalRounds} rounds created ✓ (tx: ${result.digest?.slice(0, 12)}…)`,
      ]);
    } catch (err) {
      setCreateLog((prev) => [
        ...prev,
        `Batch create FAILED: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
    }

    setCreateLog((prev) => [...prev, "Done! Check your tournaments below."]);
    await tournamentsQuery.refetch();
  }

  // ── Auto-finalize polling ────────────────────────────────────────
  const autoFinalizeRef = useRef(autoFinalizeInProgress);

  const runAutoFinalize = useCallback(async () => {
    if (!isAdmin || !account) return;
    const allJoinEvents = joinEventsQuery.data ?? [];
    const leaderboardRows = leaderboardQuery.data ?? [];
    const now = Date.now();

    // ── Auto-start: start upcoming rounds whose start_time has arrived ──
    for (const group of myTournamentGroups) {
      // Only auto-start if at least one round in the group is live or ended (tournament was activated)
      const hasActiveRound = group.rounds.some((r) => r.status === "live" || r.status === "ended");
      if (!hasActiveRound) continue;

      for (const round of group.rounds) {
        if (round.status !== "upcoming") continue;
        if (round.startTimeMs > now) continue; // not time yet
        const key = `start-${round.roundObjectId}`;
        if (autoFinalizeRef.current.current.has(key)) continue;

        autoFinalizeRef.current.current.add(key);
        setAutoFinalizeLog((prev) => [
          `[${new Date().toLocaleTimeString()}] Auto-starting Round ${round.roundNumber} (Season ${round.seasonId})…`,
          ...prev.slice(0, 19),
        ]);

        try {
          const priceStartRaw = await getLiveStartPriceRaw(round.coinSymbol);
          await startRound({ roundId: round.roundObjectId, priceStartRaw });

          setAutoFinalizeLog((prev) => [
            `[${new Date().toLocaleTimeString()}] Round ${round.roundNumber} started at $${(priceStartRaw / 1e8).toFixed(2)} ✓`,
            ...prev.slice(0, 19),
          ]);
          setStartStateByRound((p) => ({
            ...p,
            [round.roundObjectId]: {
              message: `Auto-started at $${(priceStartRaw / 1e8).toFixed(2)}`,
              txDigest: null,
              isError: false,
            },
          }));
          await tournamentsQuery.refetch();
        } catch (err) {
          setAutoFinalizeLog((prev) => [
            `[${new Date().toLocaleTimeString()}] Auto-start Round ${round.roundNumber} error: ${err instanceof Error ? err.message : "Unknown"}`,
            ...prev.slice(0, 19),
          ]);
        } finally {
          autoFinalizeRef.current.current.delete(key);
        }
      }
    }

    // ── Auto-finalize: complete & settle ended rounds ──
    for (const group of myTournamentGroups) {
      for (const round of group.rounds) {
        // Only process ended rounds that haven't been completed yet
        if (round.status !== "ended" || round.winnerDirection !== 0) continue;
        if (!round.leaderboardId) continue;
        const key = round.roundObjectId;
        if (autoFinalizeRef.current.current.has(key)) continue;

        const isFreeRound = round.entryFeeRaw <= 1;
        const isPrizeRound = !isFreeRound;

        // Prize round: only finalize after ALL score rounds settled
        if (isPrizeRound) {
          const scoreRoundsAllSettled = group.rounds
            .filter((r) => r.entryFeeRaw <= 1)
            .every((r) => r.winnerDirection !== 0 || r.isSettled);
          if (!scoreRoundsAllSettled) continue;
        }

        autoFinalizeRef.current.current.add(key);
        setAutoFinalizeLog((prev) => [
          `[${new Date().toLocaleTimeString()}] Auto-finalizing Round ${round.roundNumber} (Season ${round.seasonId})…`,
          ...prev.slice(0, 19),
        ]);

        try {
          // Fetch price_end (historical, at round end time)
          const priceEndRaw = await getRoundEndPriceRaw(
            round.coinSymbol,
            round.roundObjectId,
            round.endTimeMs,
            round.priceStart,
          );

          let top3: string[];

          if (isFreeRound) {
            // Determine winner direction
            const winDir = priceEndRaw > round.priceStart ? 1 : 2;
            // Top 3 = first 3 players who predicted correctly, sorted by timestamp
            const correctEvents = allJoinEvents
              .filter((e) => e.roundNumber === round.roundNumber && e.direction === winDir)
              .sort((a, b) => a.timestampMs - b.timestampMs);
            top3 = correctEvents.slice(0, 3).map((e) => e.player);
          } else {
            // Prize round: rank by local tournament win count (across all rounds in this season)
            const prizeJoins = new Set(
              allJoinEvents
                .filter((e) => e.roundNumber === round.roundNumber)
                .map((e) => e.player.toLowerCase()),
            );

            // Build win direction map for all rounds in this tournament
            const winDirMap = new Map<number, 1 | 2>();
            for (const r of group.rounds) {
              if (r.winnerDirection === 1 || r.winnerDirection === 2) {
                winDirMap.set(r.roundNumber, r.winnerDirection as 1 | 2);
              }
            }

            // Count wins per player across all tournament rounds
            const playerWins = new Map<string, number>();
            for (const e of allJoinEvents) {
              const addr = e.player.toLowerCase();
              if (!prizeJoins.has(addr)) continue; // only prize round participants
              const roundIds = new Set(group.rounds.map((r) => r.roundNumber));
              if (!roundIds.has(e.roundNumber)) continue; // only this tournament's rounds
              const wd = winDirMap.get(e.roundNumber);
              if (wd && e.direction === wd) {
                playerWins.set(addr, (playerWins.get(addr) ?? 0) + 1);
              } else if (!playerWins.has(addr)) {
                playerWins.set(addr, 0);
              }
            }

            // Sort by wins descending, take top 3
            top3 = Array.from(playerWins.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([addr]) => {
                // Find original-case address from join events
                const event = allJoinEvents.find((e) => e.player.toLowerCase() === addr);
                return event?.player ?? addr;
              });
          }

          // Complete game
          await completeGame({
            sessionId: round.sessionId,
            roundId: round.roundObjectId,
            registryId: round.registryId,
            leaderboardId: round.leaderboardId!,
            priceEndRaw,
            top3Players: top3,
          });

          setAutoFinalizeLog((prev) => [
            `[${new Date().toLocaleTimeString()}] Round ${round.roundNumber} completed ✓`,
            ...prev.slice(0, 19),
          ]);

          // Wait a moment then settle
          await new Promise((res) => setTimeout(res, 1500));

          await settleGame({ roundId: round.roundObjectId });

          setAutoFinalizeLog((prev) => [
            `[${new Date().toLocaleTimeString()}] Round ${round.roundNumber} settled ✓ Prizes locked!`,
            ...prev.slice(0, 19),
          ]);

          await tournamentsQuery.refetch();
        } catch (err) {
          setAutoFinalizeLog((prev) => [
            `[${new Date().toLocaleTimeString()}] Round ${round.roundNumber} error: ${err instanceof Error ? err.message : "Unknown"}`,
            ...prev.slice(0, 19),
          ]);
        } finally {
          autoFinalizeRef.current.current.delete(key);
        }
      }
    }
  }, [isAdmin, account, myTournamentGroups, joinEventsQuery.data, leaderboardQuery.data, completeGame, settleGame, startRound, tournamentsQuery]);

  // Polling
  useEffect(() => {
    if (!isAdmin || !account) return;
    const interval = setInterval(runAutoFinalize, 10_000);
    return () => clearInterval(interval);
  }, [isAdmin, account, runAutoFinalize]);

  const inputClassName =
    "w-full rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 py-2.5 text-sm font-semibold text-slate-100 outline-none form-field-glow";

  return (
    <div className="relative z-10 min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 antialiased">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 10% 12%, rgba(20,184,166,0.16), transparent 33%), radial-gradient(circle at 88% 8%, rgba(56,189,248,0.14), transparent 34%), linear-gradient(180deg, #020617 0%, #0b1120 52%, #020617 100%)",
          }}
        />
        <div className="blue-cyber-grid absolute inset-0 opacity-20" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-24 md:px-7">
        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-300">
              <span className="material-symbols-outlined text-sm leading-none">sports_esports</span>
              Admin Arena
            </span>
            <span className="rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-400">
              Local time: {mounted ? new Date(nowMs).toLocaleTimeString() : "--:--:--"}
            </span>
          </div>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Tournament <span className="text-cyan-300">Control</span>
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Create multi-round tournaments and monitor auto-finalize processes from one clean control panel.
          </p>
        </section>

        {!account ? (
          <section className="mb-8 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 text-center backdrop-blur-xl">
            <p className="mb-4 text-sm font-medium text-slate-300">Connect your admin wallet to continue.</p>
            <ConnectButton />
          </section>
        ) : !isAdmin ? (
          <section className="mb-8">
            <AlertBox type="warning">
              Your wallet is not registered as a tournament admin. You can still view tournament activity below.
            </AlertBox>
          </section>
        ) : null}

        {isAdmin && account && (
          <section className="mb-10 grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Create Multi-Round Tournament
                </h2>
                <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Admin Only
                </span>
              </div>

              <form
                onSubmit={onSubmit}
                className="space-y-5 rounded-2xl border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_18px_42px_rgba(2,6,23,0.42)] backdrop-blur-xl md:p-6"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Season ID" hint="Unique identifier for this season">
                    <input
                      type="number"
                      value={form.seasonId}
                      onChange={(e) => setForm((p) => ({ ...p, seasonId: e.target.value }))}
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Coin Symbol">
                    {availableSymbols.length > 0 ? (
                      <select
                        value={selectedCoinSymbol}
                        onChange={(e) => setForm((p) => ({ ...p, coinSymbol: e.target.value }))}
                        className={inputClassName}
                      >
                        {availableSymbols.map((symbol) => (
                          <option key={symbol} value={symbol} style={{ backgroundColor: "#0f172a", color: "#e2e8f0" }}>
                            {symbol}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={form.coinSymbol}
                        onChange={(e) => setForm((p) => ({ ...p, coinSymbol: e.target.value.toUpperCase() }))}
                        className={inputClassName}
                      />
                    )}
                  </FormField>
                </div>

                <FormField label="Entry Fee (Raw USDT)" hint="Example: 100000000 = 100 USDT">
                  <input
                    type="number"
                    value={form.entryFeeRaw}
                    onChange={(e) => setForm((p) => ({ ...p, entryFeeRaw: e.target.value }))}
                    className={inputClassName}
                  />
                  {form.entryFeeRaw && Number(form.entryFeeRaw) > 0 && (
                    <span className="text-[11px] font-semibold text-teal-300">
                      Approx. {formatUSDT(Number(form.entryFeeRaw))} USDT
                    </span>
                  )}
                </FormField>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <FormField label="Total Rounds" hint="1-10">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={form.totalRounds}
                      onChange={(e) => setForm((p) => ({ ...p, totalRounds: e.target.value }))}
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Duration (Min)">
                    <input
                      type="number"
                      min={1}
                      value={form.roundDurationMinutes}
                      onChange={(e) => setForm((p) => ({ ...p, roundDurationMinutes: e.target.value }))}
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Gap (Min)">
                    <input
                      type="number"
                      min={0}
                      value={form.gapMinutes}
                      onChange={(e) => setForm((p) => ({ ...p, gapMinutes: e.target.value }))}
                      className={inputClassName}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Start Time">
                    <input
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Min Participants">
                    <input
                      type="number"
                      min={1}
                      value={form.minParticipants}
                      onChange={(e) => setForm((p) => ({ ...p, minParticipants: e.target.value }))}
                      className={inputClassName}
                    />
                  </FormField>
                </div>

                {roundSchedule.length > 0 && (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/8 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                      Round Schedule Preview
                    </p>
                    <div className="space-y-1.5">
                      {roundSchedule.map((round) => (
                        <div key={round.roundIndex} className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                          <span className="font-medium">
                            Round {round.roundIndex}{" "}
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                              style={{
                                backgroundColor:
                                  round.roundIndex === 1 ? "rgba(245,158,11,0.2)" : "rgba(56,189,248,0.18)",
                                color: round.roundIndex === 1 ? "#fbbf24" : "#67e8f9",
                              }}
                            >
                              {round.roundIndex === 1 ? "Prize" : "Free"}
                            </span>
                          </span>
                          <span className="text-slate-400">
                            {new Date(round.startMs).toLocaleTimeString()} - {new Date(round.endMs).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validation && <AlertBox type="error">{validation}</AlertBox>}

                <button
                  type="submit"
                  disabled={!!validation || isPending}
                  className="w-full rounded-xl border px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    color: "#042f2e",
                    backgroundColor: "#2dd4bf",
                    borderColor: "rgba(45,212,191,0.7)",
                    boxShadow: "0 10px 24px rgba(20,184,166,0.24)",
                  }}
                >
                  {isPending ? "Creating..." : `Create ${form.totalRounds} Rounds - Season ${form.seasonId}`}
                </button>

                {createLog.length > 0 && (
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-950/70 p-3 font-mono">
                    {createLog.map((line, index) => {
                      const lowered = line.toLowerCase();
                      const isFailure = lowered.includes("fail") || lowered.includes("error");
                      const isSuccess = lowered.includes("success") || lowered.includes("submitted");
                      return (
                        <p
                          key={index}
                          className="text-[11px]"
                          style={{ color: isFailure ? "#fda4af" : isSuccess ? "#5eead4" : "#94a3b8" }}
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                )}
              </form>
            </div>

            <div className="xl:col-span-5">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Auto-Finalize</h2>
                <span className="rounded-full border border-teal-400/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-300">
                  Polling 10s
                </span>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_18px_42px_rgba(2,6,23,0.42)] backdrop-blur-xl">
                <p className="text-xs leading-relaxed text-slate-400">
                  Auto-finalize checks every 10 seconds for ended rounds without a winner, fetches the live market
                  price, and submits complete + settle transactions automatically.
                </p>

                <div className="rounded-xl border border-teal-500/25 bg-teal-500/8 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full animate-live-dot bg-teal-400" />
                    <span className="text-xs font-semibold text-teal-200">Active monitoring</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Watching {myTournamentGroups.reduce((sum, group) => sum + group.rounds.length, 0)} rounds across{" "}
                    {myTournamentGroups.length} tournaments.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={runAutoFinalize}
                  className="w-full rounded-xl border border-cyan-400/35 bg-cyan-500/12 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-500/20"
                >
                  Run Now
                </button>

                {autoFinalizeLog.length > 0 ? (
                  <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-950/70 p-3 font-mono">
                    {autoFinalizeLog.map((line, index) => {
                      const lowered = line.toLowerCase();
                      const isFailure = lowered.includes("error") || lowered.includes("fail");
                      const isSuccess =
                        lowered.includes("done") || lowered.includes("settled") || lowered.includes("success");
                      return (
                        <p
                          key={index}
                          className="text-[11px]"
                          style={{ color: isFailure ? "#fda4af" : isSuccess ? "#5eead4" : "#94a3b8" }}
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] font-medium italic text-slate-500">No activity yet.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {account && myTournamentGroups.length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
              My Tournaments ({myTournamentGroups.length})
            </h2>

            <div className="space-y-5">
              {myTournamentGroups.map((group) => (
                <div
                  key={group.seasonId}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_16px_36px_rgba(2,6,23,0.38)] backdrop-blur-xl"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        {group.coinSymbol}/USDT - Season {group.seasonId}
                      </h3>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {group.totalRounds} rounds - {group.completedRounds}/{group.totalRounds} completed
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.rounds.some((r) => r.status === "upcoming") && (
                        <button
                          type="button"
                          onClick={() => handleStartTournamentGroup(group)}
                          disabled={isStartPending}
                          className="rounded-lg border border-teal-400/45 bg-teal-500/14 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-200 transition hover:border-teal-300/65 hover:bg-teal-500/22 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {isStartPending ? "Starting..." : `Start Tournament (${group.rounds.filter((r) => r.status === "upcoming").length} rounds)`}
                        </button>
                      )}
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                        style={{
                          color: group.status === "live" ? "#14b8a6" : group.status === "upcoming" ? "#f59e0b" : "#cbd5e1",
                          backgroundColor:
                            group.status === "live"
                              ? "rgba(20,184,166,0.18)"
                              : group.status === "upcoming"
                                ? "rgba(245,158,11,0.16)"
                                : "rgba(148,163,184,0.16)",
                        }}
                      >
                        {group.status}
                      </span>
                    </div>
                  </div>

                  {startAllState[group.seasonId]?.message && (
                    <p
                      className="mb-2 text-[11px] font-medium"
                      style={{ color: startAllState[group.seasonId].isError ? "#fb7185" : "#2dd4bf" }}
                    >
                      {startAllState[group.seasonId].message}
                    </p>
                  )}

                  <div className="space-y-3">
                    {group.rounds.map((tournament) => {
                      const startState = startStateByRound[tournament.roundObjectId];
                      const cancelState = cancelStateByRound[tournament.roundObjectId];
                      const isPrize = tournament.entryFeeRaw > 1;

                      return (
                        <article
                          key={tournament.roundObjectId}
                          className="space-y-3 rounded-xl border bg-slate-950/65 p-4"
                          style={{
                            borderColor: isPrize ? "rgba(245,158,11,0.34)" : "rgba(71,85,105,0.55)",
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-100">Round {tournament.roundNumber}</span>
                              <span
                                className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                                style={{
                                  color: isPrize ? "#fbbf24" : "#67e8f9",
                                  backgroundColor: isPrize ? "rgba(245,158,11,0.2)" : "rgba(56,189,248,0.16)",
                                }}
                              >
                                {isPrize ? "Prize" : "Free"}
                              </span>
                            </div>
                            <StatusBadge status={tournament.status} />
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
                            <div>
                              <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Start</p>
                              <p className="mt-1 text-slate-300">{formatDateTime(tournament.startTimeMs)}</p>
                            </div>
                            <div>
                              <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">End</p>
                              <p className="mt-1 text-slate-300">{formatDateTime(tournament.endTimeMs)}</p>
                            </div>
                            <div>
                              <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Participants</p>
                              <p className="mt-1 text-slate-300">{tournament.totalParticipants}</p>
                            </div>
                          </div>

                          {tournament.status === "upcoming" && (
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-2.5">
                                <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                                <span className="text-xs font-medium text-slate-400">
                                  {startState?.message
                                    ? startState.message
                                    : Date.now() >= tournament.startTimeMs
                                      ? "Will auto-start shortly…"
                                      : "Waiting for scheduled time"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartTournament(tournament.roundObjectId, group.coinSymbol)}
                                disabled={isStartPending}
                                className="rounded-lg border border-teal-400/45 bg-teal-500/14 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-teal-200 transition hover:border-teal-300/65 hover:bg-teal-500/22 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {isStartPending ? "Starting..." : "Start"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelTournament(tournament.sessionId, tournament.roundObjectId)}
                                disabled={isCancelPending}
                                className="rounded-lg border border-rose-400/35 bg-rose-500/12 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-rose-200 transition hover:border-rose-300/55 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {isCancelPending ? "..." : "Cancel"}
                              </button>
                            </div>
                          )}

                          {tournament.status === "live" && (
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex flex-1 items-center gap-2 rounded-lg border border-teal-500/28 bg-teal-500/8 px-4 py-2.5">
                                <span className="h-2 w-2 rounded-full animate-live-dot bg-teal-400" />
                                <span className="text-xs font-medium text-teal-100">Round currently live</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCancelTournament(tournament.sessionId, tournament.roundObjectId)}
                                disabled={isCancelPending}
                                className="rounded-lg border border-rose-400/35 bg-rose-500/12 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-rose-200 transition hover:border-rose-300/55 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {isCancelPending ? "..." : "Cancel"}
                              </button>
                            </div>
                          )}

                          {(tournament.status === "ended" || tournament.isSettled) && (
                            <div className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/70 px-4 py-2.5">
                              <span className="material-symbols-outlined text-sm text-teal-300">check_circle</span>
                              <span className="text-xs text-slate-300">
                                Round ended. Winners can claim rewards in{" "}
                                <a href="/profile" className="font-semibold text-teal-300 hover:text-teal-200">
                                  My Arena
                                </a>
                              </span>
                            </div>
                          )}

                          {tournament.status === "cancelled" && (
                            <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-2.5">
                              <span className="text-xs font-medium text-rose-200">Round cancelled</span>
                            </div>
                          )}

                          {[startState, cancelState]
                            .filter(Boolean)
                            .map((state, index) =>
                              state?.message ? (
                                <p
                                  key={index}
                                  className="text-[11px] font-medium"
                                  style={{ color: state.isError ? "#fda4af" : "#5eead4" }}
                                >
                                  {state.message}
                                  {state.txDigest && (
                                    <a
                                      href={`${EXPLORER_BASE}/txblock/${state.txDigest}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="ml-2 text-sky-300 hover:text-sky-200"
                                    >
                                      (view tx)
                                    </a>
                                  )}
                                </p>
                              ) : null,
                            )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {account && isAdmin && myTournamentGroups.length === 0 && !tournamentsQuery.isLoading && (
          <section className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/55 p-8 text-center">
            <p className="text-sm font-medium text-slate-400">No tournaments created yet. Use the form above.</p>
          </section>
        )}
      </main>
    </div>
  );
}
