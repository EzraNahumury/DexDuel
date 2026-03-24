import crypto from "crypto";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "dd_admin_session";
const NONCE_COOKIE = "dd_admin_nonce";
const TEMP_ADMIN_HEADER = "x-admin-address";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

type AdminCheck =
  | { ok: true; address: string }
  | { ok: false; status: number; error: string };

type SessionPayload = {
  address: string;
  iat: number;
  exp: number;
};

export function normalizeAdminAddress(address: string): string {
  return address.trim().toLowerCase();
}

function getAdminAllowlist(): Set<string> {
  const raw = process.env.ADMIN_ADDRESSES ?? "";
  const values = raw
    .split(",")
    .map((value) => normalizeAdminAddress(value))
    .filter(Boolean);
  return new Set(values);
}

function getSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET ?? null;
}

function signSession(payload: SessionPayload): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySession(token: string): SessionPayload | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  if (!payload?.address || !payload?.exp) return null;
  if (Date.now() > payload.exp) return null;
  return payload;
}

export function createAdminSession(address: string): string {
  const now = Date.now();
  const payload: SessionPayload = {
    address: normalizeAdminAddress(address),
    iat: now,
    exp: now + SESSION_TTL_SECONDS * 1000,
  };
  return signSession(payload);
}

export function getAdminNonceCookieName(): string {
  return NONCE_COOKIE;
}

export function getAdminSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getAdminSessionMaxAge(): number {
  return SESSION_TTL_SECONDS;
}

export function getAdminAddressFromRequest(req: NextRequest): string | null {
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    const payload = verifySession(sessionToken);
    if (payload?.address) return normalizeAdminAddress(payload.address);
  }

  // TEMP: header-based admin guard for MVP usage without wallet signature flow.
  const headerAddress = req.headers.get(TEMP_ADMIN_HEADER);
  if (headerAddress) return normalizeAdminAddress(headerAddress);

  return null;
}

export function requireAdmin(req: NextRequest): AdminCheck {
  const allowlist = getAdminAllowlist();
  if (allowlist.size === 0) {
    return { ok: false, status: 500, error: "ADMIN_ADDRESSES is not configured" };
  }

  const address = getAdminAddressFromRequest(req);
  if (!address) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!allowlist.has(address)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, address };
}

export function isAdminAuthorized(req: NextRequest): boolean {
  const allowlist = getAdminAllowlist();
  if (allowlist.size === 0) return false;

  const address = getAdminAddressFromRequest(req);
  if (!address) return false;
  return allowlist.has(address);
}

export function isAddressAllowed(address: string): boolean {
  const allowlist = getAdminAllowlist();
  if (allowlist.size === 0) return false;
  return allowlist.has(normalizeAdminAddress(address));
}
