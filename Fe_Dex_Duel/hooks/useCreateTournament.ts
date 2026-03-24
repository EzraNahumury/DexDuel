"use client";

import { useSuiClient, useCurrentAccount, useCurrentWallet } from "@onelabs/dapp-kit";
import { useState } from "react";
import { buildCreateTournamentTx, buildCreateTournamentBatchTx, type CreateTournamentParams } from "@/lib/transactions";
import { signTransactionForExecution } from "@/lib/walletFeatures";

export function useCreateTournament() {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function createTournament(params: CreateTournamentParams) {
    if (!currentWallet || !account) throw new Error("Wallet not connected");

    setIsPending(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const tx = buildCreateTournamentTx(params);
      tx.setSender(account.address);

      const bytes = await tx.build({ client });
      const { transactionBlockBytes, signature } = await signTransactionForExecution(
        currentWallet,
        account,
        tx,
        bytes,
      );

      const result = await client.executeTransactionBlock({
        transactionBlock: transactionBlockBytes,
        signature,
        options: { showObjectChanges: true, showRawEffects: true },
      });

      setIsSuccess(true);
      return result;
    } catch (e) {
      setIsError(true);
      setError(e as Error);
      throw e;
    } finally {
      setIsPending(false);
    }
  }

  async function batchCreateTournament(
    rounds: Array<{
      roundId: number;
      seasonId: number;
      coinSymbol: string;
      startTimeMs: number;
      endTimeMs: number;
      entryFeeRaw: number;
      minParticipants: number;
      earlyWindowMinutes: number;
    }>,
  ) {
    if (!currentWallet || !account) throw new Error("Wallet not connected");

    setIsPending(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const tx = buildCreateTournamentBatchTx(rounds);
      tx.setSender(account.address);

      const bytes = await tx.build({ client });
      const { transactionBlockBytes, signature } = await signTransactionForExecution(
        currentWallet,
        account,
        tx,
        bytes,
      );

      const result = await client.executeTransactionBlock({
        transactionBlock: transactionBlockBytes,
        signature,
        options: { showObjectChanges: true, showRawEffects: true },
      });

      setIsSuccess(true);
      return result;
    } catch (e) {
      setIsError(true);
      setError(e as Error);
      throw e;
    } finally {
      setIsPending(false);
    }
  }

  return { createTournament, batchCreateTournament, isPending, isSuccess, isError, error };
}

