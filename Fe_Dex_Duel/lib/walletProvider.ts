"use client";

export type BackendTxPayload = {
  target?: string;
  function?: string;
  args?: unknown[];
  arguments?: unknown[];
  typeArguments?: string[];
};

export type WalletTxResult = {
  hash: string;
  raw: unknown;
};

type WalletAccount = {
  address?: string;
};

type WalletProviderLike = {
  connect?: (input?: Record<string, unknown>) => Promise<unknown>;
  account?: () => Promise<WalletAccount | null>;
  signMessage?: (input: Record<string, unknown>) => Promise<unknown>;
  signAndSubmitTransaction?: (input: Record<string, unknown>) => Promise<unknown>;
  address?: string;
  accounts?: WalletAccount[];
};

type WalletResultWithAddress = {
  address?: string;
  account?: WalletAccount;
  accounts?: WalletAccount[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function pickAddressFromResult(result: unknown): string | null {
  const parsed = asRecord(result) as WalletResultWithAddress | null;
  if (!parsed) return null;
  if (typeof parsed.address === "string" && parsed.address) return parsed.address;

  if (parsed.account && typeof parsed.account.address === "string" && parsed.account.address) {
    return parsed.account.address;
  }

  const first = parsed.accounts?.[0];
  if (first && typeof first.address === "string" && first.address) return first.address;
  return null;
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function resolveWindowWallet(): WalletProviderLike | null {
  if (typeof window === "undefined") return null;
  const candidates: unknown[] = [
    (window as Window & { aptos?: unknown }).aptos,
    (window as Window & { onewallet?: unknown }).onewallet,
    (window as Window & { oneWallet?: unknown }).oneWallet,
    (window as Window & { wallet?: unknown }).wallet,
  ];

  for (const candidate of candidates) {
    const parsed = asRecord(candidate) as WalletProviderLike | null;
    if (!parsed) continue;
    if (typeof parsed.connect === "function") return parsed;
  }
  return null;
}

function isWalletRpcError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("rpc") ||
    message.includes("endpoint") ||
    message.includes("-32601") ||
    message.includes("method not found") ||
    message.includes("failed to fetch")
  );
}

function pickSignature(result: unknown): string {
  const parsed = asRecord(result);
  if (!parsed) throw new Error("Wallet did not return signature result");

  const direct = parsed.signature;
  if (typeof direct === "string" && direct) return direct;

  if (asRecord(direct) && typeof (direct as Record<string, unknown>).signature === "string") {
    return (direct as Record<string, unknown>).signature as string;
  }

  throw new Error("Wallet did not return a signature string");
}

function buildPayloadCandidates(tx: BackendTxPayload): Record<string, unknown>[] {
  const target = tx.target ?? tx.function;
  if (!target) throw new Error("Missing tx target/function from backend");

  const args = Array.isArray(tx.args) ? tx.args : Array.isArray(tx.arguments) ? tx.arguments : [];
  const typeArguments = Array.isArray(tx.typeArguments) ? tx.typeArguments : [];

  return [
    {
      payload: {
        function: target,
        functionArguments: args,
        typeArguments,
      },
    },
    {
      payload: {
        function: target,
        arguments: args,
        typeArguments,
      },
    },
    {
      data: {
        function: target,
        functionArguments: args,
        typeArguments,
      },
    },
    {
      data: {
        function: target,
        arguments: args,
        typeArguments,
      },
    },
    {
      function: target,
      arguments: args,
      typeArguments,
    },
  ];
}

function extractTxHash(result: unknown): string {
  const parsed = asRecord(result);
  if (!parsed) return "";

  const candidates = [
    parsed.hash,
    parsed.txHash,
    parsed.transactionHash,
    parsed.digest,
    parsed.txnHash,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value) return value;
  }
  return "";
}

export function getWalletProvider(): WalletProviderLike {
  const provider = resolveWindowWallet();
  if (!provider) {
    throw new Error("OneWallet provider not found");
  }
  return provider;
}

export async function connectWallet(): Promise<string> {
  const provider = getWalletProvider();
  const connected = await provider.connect?.();
  const fromConnect = pickAddressFromResult(connected);
  if (fromConnect) return normalizeAddress(fromConnect);

  if (typeof provider.account === "function") {
    const account = await provider.account();
    if (account?.address) return normalizeAddress(account.address);
  }

  if (typeof provider.address === "string" && provider.address) {
    return normalizeAddress(provider.address);
  }

  const firstAccount = provider.accounts?.[0];
  if (firstAccount?.address) return normalizeAddress(firstAccount.address);

  throw new Error("Wallet connected but no address returned");
}

export async function signNonceMessage(address: string, nonce: string): Promise<string> {
  const provider = getWalletProvider();
  if (typeof provider.signMessage !== "function") {
    throw new Error("Wallet does not support signMessage");
  }

  const normalizedAddress = normalizeAddress(address);
  const message = `DexDuel Admin Login\nNonce: ${nonce}\nAddress: ${normalizedAddress}\nChain: one-testnet`;

  try {
    const result = await provider.signMessage({
      message,
      nonce,
      address: normalizedAddress,
    });
    return pickSignature(result);
  } catch (error) {
    if (isWalletRpcError(error)) {
      throw new Error("Wallet RPC endpoint failed");
    }
    throw error;
  }
}

export async function signAndSubmitBackendTx(tx: BackendTxPayload): Promise<WalletTxResult> {
  const provider = getWalletProvider();
  if (typeof provider.signAndSubmitTransaction !== "function") {
    throw new Error("Wallet does not support signAndSubmitTransaction");
  }

  const candidates = buildPayloadCandidates(tx);
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const result = await provider.signAndSubmitTransaction(candidate);
      return {
        hash: extractTxHash(result),
        raw: result,
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (isWalletRpcError(lastError)) {
    throw new Error("Wallet RPC endpoint failed");
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("Failed to submit transaction through wallet");
}
