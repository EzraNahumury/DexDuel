import { SuiClient } from "@onelabs/sui/client";
import { onechainConfig } from "@/src/config/onechain";

/**
 * Singleton read-only client for querying OneChain state.
 * Uses the RPC from onechainConfig — no hardcoding.
 */
let _client: SuiClient | null = null;

export function getOnechainClient(): SuiClient {
  if (!_client) {
    _client = new SuiClient({ url: onechainConfig.rpc });
  }
  return _client;
}
