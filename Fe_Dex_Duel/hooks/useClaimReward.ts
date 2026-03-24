"use client";

import { useSuiClient, useCurrentAccount, useCurrentWallet } from "@onelabs/dapp-kit";
import { useState } from "react";
import { buildClaimRewardTx, buildBatchClaimRewardTx } from "@/lib/transactions";
import { signTransactionForExecution } from "@/lib/walletFeatures";

/**
 * Hook to claim principal + yield reward after a round is settled.
 * Pre-builds BCS bytes to bypass OneWallet's JSON→BCS re-encoding.
 */
export function useClaimReward() {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function claimReward(sessionId: string, roundId: string) {
    if (!currentWallet || !account) throw new Error("Wallet not connected");
    setIsPending(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
    try {
      const tx = buildClaimRewardTx(sessionId, roundId, account.address);
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
        options: { showRawEffects: true },
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

  /**
   * Batch claim multiple rounds in a single transaction.
   */
  async function batchClaimReward(rounds: Array<{ sessionId: string; roundId: string }>) {
    if (!currentWallet || !account) throw new Error("Wallet not connected");
    if (rounds.length === 0) throw new Error("No rounds to claim");
    setIsPending(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
    try {
      const tx = buildBatchClaimRewardTx(rounds, account.address);
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
        options: { showRawEffects: true },
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

  return { claimReward, batchClaimReward, isPending, isSuccess, isError, error };
}
