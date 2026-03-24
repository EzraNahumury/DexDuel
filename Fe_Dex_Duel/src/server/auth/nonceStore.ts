import crypto from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const NONCE_COOKIE = "dd_admin_nonce";
const NONCE_TTL_MS = 10 * 60 * 1000;

type NoncePayload = {
  nonce: string;
  issuedAt: number;
  expiresAt: number;
};

function getSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET ?? null;
}

function signPayload(payload: NoncePayload): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyPayload(token: string): NoncePayload | null {
  const secret = getSecret();
  if (!secret) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as NoncePayload;
  if (!payload?.nonce || !payload?.expiresAt) return null;
  if (Date.now() > payload.expiresAt) return null;

  return payload;
}

export function createNonce(): string {
  return crypto.randomUUID();
}

export function setNonceCookie(response: NextResponse, nonce: string) {
  const secret = getSecret();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }

  const payload: NoncePayload = {
    nonce,
    issuedAt: Date.now(),
    expiresAt: Date.now() + NONCE_TTL_MS,
  };
  const token = signPayload(payload);

  response.cookies.set({
    name: NONCE_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(NONCE_TTL_MS / 1000),
  });
}

export function verifyNonce(req: NextRequest, nonce: string): boolean {
  const token = req.cookies.get(NONCE_COOKIE)?.value;
  if (!token) return false;

  const payload = verifyPayload(token);
  if (!payload) return false;

  return payload.nonce === nonce;
}

export function clearNonce(response: NextResponse) {
  response.cookies.set({
    name: NONCE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
