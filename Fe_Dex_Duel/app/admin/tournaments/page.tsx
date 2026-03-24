"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminTournamentForm } from "@/components/AdminTournamentForm";
import {
  ApiError,
  createTournamentTx,
  getAuthNonce,
  getTournaments,
  type TournamentItem,
  verifyAdmin,
} from "@/lib/api";
import {
  connectWallet,
  signAndSubmitBackendTx,
  signNonceMessage,
} from "@/lib/walletProvider";

type FormState = {
  pairSymbol: string;
  startTime: string;
  endTime: string;
  seasonNo: string;
};

const INITIAL_FORM: FormState = {
  pairSymbol: "",
  startTime: "",
  endTime: "",
  seasonNo: "",
};

function formatTimestamp(value: string): string {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "-";
  return new Date(time).toLocaleString();
}

function parseOptionalSeason(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.floor(parsed);
}

function toStartEndMs(startTime: string, endTime: string): { startTimeMs: number; endTimeMs: number } {
  const startTimeMs = Date.parse(startTime);
  const endTimeMs = Date.parse(endTime);
  if (!Number.isFinite(startTimeMs) || !Number.isFinite(endTimeMs)) {
    throw new Error("Start and end time are required");
  }
  if (startTimeMs >= endTimeMs) {
    throw new Error("startTime must be earlier than endTime");
  }
  return { startTimeMs, endTimeMs };
}

export default function AdminTournamentsPage() {
  const [address, setAddress] = useState<string>("");
  const [adminSessionActive, setAdminSessionActive] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const canLogin = useMemo(() => !!address && !isLoggingIn, [address, isLoggingIn]);
  const canCreate = useMemo(
    () => !!address && adminSessionActive && !isCreating,
    [address, adminSessionActive, isCreating],
  );

  async function refreshTournaments() {
    setIsLoadingList(true);
    try {
      const response = await getTournaments();
      setTournaments(response.data ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load tournaments");
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    void refreshTournaments();
  }, []);

  async function handleConnectWallet() {
    setErrorMessage("");
    setStatusMessage("");
    setTxHash("");
    setIsConnecting(true);
    try {
      const nextAddress = await connectWallet();
      setAddress(nextAddress);
      setStatusMessage(`Connected: ${nextAddress}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleLoginAsAdmin() {
    if (!address) {
      setErrorMessage("Connect OneWallet first");
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setTxHash("");
    setIsLoggingIn(true);

    try {
      const nonceResponse = await getAuthNonce();
      const signature = await signNonceMessage(address, nonceResponse.nonce);
      const verifyResponse = await verifyAdmin(address, signature, nonceResponse.nonce);

      if (!verifyResponse.ok) {
        throw new Error(verifyResponse.error ?? "Admin login failed");
      }

      setAdminSessionActive(true);
      setStatusMessage("Admin session active");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErrorMessage("Not authorized  login as admin first");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Admin login failed");
      }
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleCreateTournament() {
    if (!canCreate) {
      setErrorMessage("Not authorized  login as admin first");
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setTxHash("");

    setIsCreating(true);
    try {
      const pairSymbol = form.pairSymbol.trim();
      if (!pairSymbol) {
        throw new Error("pairSymbol is required");
      }

      const { startTimeMs, endTimeMs } = toStartEndMs(form.startTime, form.endTime);
      const seasonNo = parseOptionalSeason(form.seasonNo);
      const createResponse = await createTournamentTx({
        pairSymbol,
        startTimeMs,
        endTimeMs,
        seasonNo,
      });

      if (!createResponse.tx) {
        throw new Error(createResponse.error ?? "Backend did not return tx payload");
      }

      const submitted = await signAndSubmitBackendTx(createResponse.tx);
      setTxHash(submitted.hash);
      setStatusMessage("Tournament create transaction submitted");
      await refreshTournaments();
      setForm(INITIAL_FORM);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErrorMessage("Not authorized  login as admin first");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Failed to create tournament");
      }
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <h1 className="text-2xl font-semibold text-slate-100">Admin Tournaments</h1>
        <p className="mt-2 text-sm text-slate-400">
          Reads from backend DB and submits backend-built transactions via wallet.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConnecting ? "Connecting..." : "Connect OneWallet"}
          </button>
          <button
            type="button"
            onClick={handleLoginAsAdmin}
            disabled={!canLogin}
            className="rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingIn ? "Signing..." : "Login as admin"}
          </button>
        </div>

        <div className="mt-3 text-sm">
          <p className="text-slate-300">Address: {address || "-"}</p>
          <p className="text-slate-300">
            Session:{" "}
            <span className={adminSessionActive ? "text-emerald-400" : "text-slate-400"}>
              {adminSessionActive ? "Admin session active" : "Inactive"}
            </span>
          </p>
        </div>

        {statusMessage ? <p className="mt-3 text-sm text-emerald-400">{statusMessage}</p> : null}
        {errorMessage ? <p className="mt-3 text-sm text-rose-400">{errorMessage}</p> : null}
        {txHash ? <p className="mt-3 text-sm text-cyan-400">Tx hash: {txHash}</p> : null}
      </section>

      <div className="mt-6">
        <AdminTournamentForm
          pairSymbol={form.pairSymbol}
          startTime={form.startTime}
          endTime={form.endTime}
          seasonNo={form.seasonNo}
          onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
          onCreate={handleCreateTournament}
          isCreating={isCreating}
          disabled={!canCreate}
        />
      </div>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Tournaments (DB)</h2>
          <button
            type="button"
            onClick={() => void refreshTournaments()}
            disabled={isLoadingList}
            className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingList ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-300">
              <tr>
                <th className="px-2 py-2 font-medium">Pair</th>
                <th className="px-2 py-2 font-medium">Round</th>
                <th className="px-2 py-2 font-medium">Season</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Start</th>
                <th className="px-2 py-2 font-medium">End</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((item) => (
                <tr key={item.id} className="border-t border-slate-800 text-slate-200">
                  <td className="px-2 py-2">{item.pairSymbol}</td>
                  <td className="px-2 py-2">{item.chainRoundId}</td>
                  <td className="px-2 py-2">{item.seasonId ?? "-"}</td>
                  <td className="px-2 py-2">{item.status}</td>
                  <td className="px-2 py-2">{formatTimestamp(item.startTime)}</td>
                  <td className="px-2 py-2">{formatTimestamp(item.endTime)}</td>
                </tr>
              ))}
              {tournaments.length === 0 ? (
                <tr>
                  <td className="px-2 py-4 text-slate-400" colSpan={6}>
                    No tournaments found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
