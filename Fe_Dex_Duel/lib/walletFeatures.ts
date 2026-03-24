import type { Transaction } from "@onelabs/sui/transactions";

type TransactionBytes = string | Uint8Array;

type SignTransactionBlockInput = {
  transactionBlock: Transaction | Uint8Array;
  account: unknown;
  chain: string;
};

type SignTransactionBlockOutput = {
  transactionBlockBytes?: TransactionBytes;
  bytes?: TransactionBytes;
  signature: string;
};

type SignTransactionInput = {
  transaction: { toJSON: () => Promise<string> };
  account: unknown;
  chain: string;
};

type SignTransactionOutput = {
  bytes: TransactionBytes;
  signature: string;
};

type SignTransactionBlockFeature = {
  signTransactionBlock: (
    input: SignTransactionBlockInput,
  ) => Promise<SignTransactionBlockOutput>;
};

type SignTransactionFeature = {
  signTransaction: (
    input: SignTransactionInput,
  ) => Promise<SignTransactionOutput>;
};

type WalletLike = {
  features: Readonly<Record<string, unknown>>;
  chains: readonly string[];
};

type AccountLike = {
  chains?: readonly string[];
};

type SignedExecutionPayload = {
  transactionBlockBytes: TransactionBytes;
  signature: string;
};

const PREFERRED_TESTNET_CHAINS = [
  "one:testnet",
  "onechain:testnet",
  "sui:testnet",
] as const;

function isSignTransactionBlockFeature(
  feature: unknown,
): feature is SignTransactionBlockFeature {
  if (!feature || typeof feature !== "object") return false;
  if (!("signTransactionBlock" in feature)) return false;

  const candidate = feature as { signTransactionBlock?: unknown };
  return typeof candidate.signTransactionBlock === "function";
}

function isSignTransactionFeature(
  feature: unknown,
): feature is SignTransactionFeature {
  if (!feature || typeof feature !== "object") return false;
  if (!("signTransaction" in feature)) return false;

  const candidate = feature as { signTransaction?: unknown };
  return typeof candidate.signTransaction === "function";
}

function getTransactionBytes(
  output: SignTransactionBlockOutput | SignTransactionOutput,
): TransactionBytes {
  if ("transactionBlockBytes" in output && output.transactionBlockBytes) {
    return output.transactionBlockBytes;
  }
  if ("bytes" in output && output.bytes) return output.bytes;
  throw new Error("Wallet signer did not return transaction bytes");
}

export function resolveWalletChain(chains: readonly string[]): string {
  for (const chain of PREFERRED_TESTNET_CHAINS) {
    if (chains.includes(chain)) return chain;
  }
  return chains[0] ?? "one:testnet";
}

function getAccountChains(account: unknown): readonly string[] {
  if (!account || typeof account !== "object") return [];
  const maybeAccount = account as AccountLike;
  if (!Array.isArray(maybeAccount.chains)) return [];
  return maybeAccount.chains;
}

function resolveSigningChain(
  walletChains: readonly string[],
  accountChains: readonly string[],
): string {
  const commonChains = walletChains.filter((chain) => accountChains.includes(chain));
  if (commonChains.length > 0) {
    return resolveWalletChain(commonChains);
  }

  if (accountChains.length > 0) {
    return resolveWalletChain(accountChains);
  }

  return resolveWalletChain(walletChains);
}

export async function signTransactionForExecution(
  wallet: WalletLike,
  account: unknown,
  transaction: Transaction,
  builtBytes: Uint8Array,
): Promise<SignedExecutionPayload> {
  const chain = resolveSigningChain(wallet.chains, getAccountChains(account));
  const features = wallet.features;

  const signTxBlockFeature = features["sui:signTransactionBlock"];
  if (isSignTransactionBlockFeature(signTxBlockFeature)) {
    try {
      const signed = await signTxBlockFeature.signTransactionBlock({
        transactionBlock: builtBytes,
        account,
        chain,
      });

      return {
        transactionBlockBytes: getTransactionBytes(signed),
        signature: signed.signature,
      };
    } catch {
      const signed = await signTxBlockFeature.signTransactionBlock({
        transactionBlock: transaction,
        account,
        chain,
      });

      return {
        transactionBlockBytes: getTransactionBytes(signed),
        signature: signed.signature,
      };
    }
  }

  const signTxFeature = features["sui:signTransaction"];
  if (isSignTransactionFeature(signTxFeature)) {
    const signed = await signTxFeature.signTransaction({
      transaction,
      account,
      chain,
    });

    return {
      transactionBlockBytes: signed.bytes,
      signature: signed.signature,
    };
  }

  throw new Error("Wallet does not support transaction signing features");
}
