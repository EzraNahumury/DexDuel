"use client";

import { useState } from "react";
import { useCurrentAccount, useCurrentWallet, useSuiClient } from "@onelabs/dapp-kit";
import { buildClaimRewardsTx, buildClaimRefundTx } from "@/src/lib/onechain/tx";
import { signTransactionForExecution } from "@/lib/walletFeatures";
import type { ObjectId } from "@/src/types/onechain";

interface UseClaimResult {
  claimRewards: (sessionId: ObjectId, roundId: ObjectId) => Promise<{ digest: string }>;
  claimRefund: (roundId: ObjectId) => Promise<{ digest: string }>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * useClaim — wraps claim_rewards and claim_tournament_refund transactions.
 */
export function useClaim(): UseClaimResult {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  function reset() {
    setIsPending(false);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
  }

  async function execute(tx: ReturnType<typeof buildClaimRewardsTx>): Promise<{ digest: string }> {
    if (!currentWallet || !account) throw new Error("Wallet not connected");

    setIsPending(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      tx.setSender(account.address);
      const bytes = await tx.build({ client });
      const { transactionBlockBytes, signature } = await signTransactionForExecution(
        currentWallet,
        account,
        tx,
        bytes
      );

      const result = await client.executeTransactionBlock({
        transactionBlock: transactionBlockBytes,
        signature,
        options: { showEffects: true },
      });

      setIsSuccess(true);
      return { digest: result.digest };
    } catch (e) {
      const err = e as Error;
      setIsError(true);
      setError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }

  async function claimRewards(sessionId: ObjectId, roundId: ObjectId) {
    if (!account) throw new Error("Wallet not connected");
    const tx = buildClaimRewardsTx({
      sessionObjectId: sessionId,
      roundObjectId: roundId,
      senderAddress: account.address as ObjectId,
    });
    return execute(tx);
  }

  async function claimRefund(roundId: ObjectId) {
    if (!account) throw new Error("Wallet not connected");
    const tx = buildClaimRefundTx({
      roundObjectId: roundId,
      senderAddress: account.address as ObjectId,
    });
    return execute(tx);
  }

  return { claimRewards, claimRefund, isPending, isSuccess, isError, error, reset };
}
