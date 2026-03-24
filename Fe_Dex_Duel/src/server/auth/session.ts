import crypto from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeAdminAddress } from "./adminAllowlist";

const SESSION_COOKIE = "dd_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type AdminSession = {
  address: string;
  issuedAt: number;
  expiresAt: number;
};

function getSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET ?? null;
}

function signPayload(payload: AdminSession): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyPayload(token: string): AdminSession | null {
  const secret = getSecret();
  if (!secret) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSession;
  if (!payload?.address || !payload?.expiresAt) return null;
  if (Date.now() > payload.expiresAt) return null;

  return payload;
}

export function createSession(address: string): { token: string; session: AdminSession } {
  const now = Date.now();
  const session: AdminSession = {
    address: normalizeAdminAddress(address),
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  return { token: signPayload(session), session };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getSessionFromRequest(req: NextRequest): AdminSession | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyPayload(token);
}
