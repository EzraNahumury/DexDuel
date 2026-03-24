// ──────────────────────────────────────────────────────────
// Shared helpers for parsing Move event parsedJson fields
// ──────────────────────────────────────────────────────────

export function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

export function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
    }
    if (typeof value === "bigint") return Number(value);
    return fallback;
}

export function toBigInt(value: unknown, fallback = BigInt(0)): bigint {
    try {
        if (typeof value === "bigint") return value;
        if (typeof value === "number") return BigInt(Math.floor(value));
        if (typeof value === "string" && value.trim() !== "") return BigInt(value.trim());
    } catch {
        // fall through
    }
    return fallback;
}

/**
 * Normalize a u64 timestamp coming from the RPC to a JS Date.
 * – If the value is > 10^12 we treat it as milliseconds (what CreateTournamentTx passes).
 * – Otherwise we treat it as Unix seconds.
 */
export function toDate(value: unknown): Date {
    const n = toNumber(value, 0);
    if (n <= 0) return new Date(0);
    return n > 1_000_000_000_000 ? new Date(n) : new Date(n * 1_000);
}

/**
 * Decode a Move `vector<u8>` coin symbol.
 * parsedJson delivers it as an array of numbers or already as a string.
 */
export function decodeCoinSymbol(value: unknown): string {
    if (typeof value === "string") return value.trim().toUpperCase();
    if (Array.isArray(value)) {
        const bytes = (value as unknown[])
            .map((item) => toNumber(item))
            .filter((n) => n > 0 && n < 256);
        return Buffer.from(bytes).toString("utf8").trim().toUpperCase();
    }
    return "UNKNOWN";
}

export function toPlayer(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}
