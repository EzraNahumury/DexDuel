"use client";

import { useSuiClient, useCurrentAccount, useCurrentWallet } from "@onelabs/dapp-kit";
import { useState } from "react";
import { buildClaimFaucetTx } from "@/lib/transactions";
import { FAUCET_AMOUNT_USDT } from "@/lib/constants";
import { signTransactionForExecution } from "@/lib/walletFeatures";

/**
 * Hook to claim 100 USDT from the public faucet.
 *
 * Pre-builds BCS bytes with the testnet client so TransferObjects
 * is preserved — bypasses OneWallet's JSON→BCS re-encoding which
 * silently drops TransferObjects commands.
 */
export function useFaucet() {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function claimFaucet(senderAddress: string) {
    if (!currentWallet || !account) throw new Error("Wallet not connected");
    setIsPending(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
    try {
      const tx = buildClaimFaucetTx(senderAddress);
      tx.setSender(senderAddress);

      // Build BCS bytes via our testnet client — all commands preserved
      const bytes = await tx.build({ client });

      // Sign raw bytes directly (skip wallet JSON→BCS re-encoding)
      const { transactionBlockBytes, signature } = await signTransactionForExecution(
        currentWallet,
        account,
        tx,
        bytes,
      );

      // Submit via testnet RPC
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

  return {
    claimFaucet,
    isPending,
    isSuccess,
    isError,
    error,
    faucetAmount: FAUCET_AMOUNT_USDT,
  };
}
