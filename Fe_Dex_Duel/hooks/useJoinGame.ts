"use client";

import { useSuiClient, useCurrentAccount, useCurrentWallet } from "@onelabs/dapp-kit";
import { useState } from "react";
import { buildJoinGameTx } from "@/lib/transactions";
import { signTransactionForExecution } from "@/lib/walletFeatures";

export interface JoinGameParams {
  sessionId: string;
  roundId: string;
  registryId: string;
  direction: 1 | 2;
  usdtCoinObjectId: string;
  entryFeeRaw: number;
}

/**
 * Hook to submit a prediction and join a game round.
 * Pre-builds BCS bytes to bypass OneWallet's JSON→BCS re-encoding.
 */
export function useJoinGame() {
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

  async function joinGame(params: JoinGameParams) {
    if (!currentWallet || !account) throw new Error("Wallet not connected");
    setIsPending(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
    try {
      const tx = buildJoinGameTx(
        params.sessionId,
        params.roundId,
        params.registryId,
        params.direction,
        params.usdtCoinObjectId,
        params.entryFeeRaw,
      );
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

  return { joinGame, isPending, isSuccess, isError, error, reset };
}
