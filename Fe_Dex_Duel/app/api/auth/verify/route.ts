import { NextRequest, NextResponse } from "next/server";
import { verifyPersonalMessageSignature } from "@onelabs/sui/verify";
import { isAdmin, normalizeAdminAddress } from "@/src/server/auth/adminAllowlist";
import {
  clearNonce,
  verifyNonce,
} from "@/src/server/auth/nonceStore";
import { createSession, setSessionCookie } from "@/src/server/auth/session";

type VerifyBody = {
  address?: string;
  signature?: string;
  nonce?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VerifyBody;
    const address = body.address?.trim();
    const signature = body.signature?.trim();
    const nonce = body.nonce?.trim();

    if (!address || !signature || !nonce) {
      return Response.json(
        { ok: false, error: "Missing address, signature, or nonce" },
        { status: 400 },
      );
    }

    if (!process.env.ADMIN_SESSION_SECRET) {
      return Response.json(
        { ok: false, error: "ADMIN_SESSION_SECRET is not configured" },
        { status: 500 },
      );
    }

    if (!verifyNonce(req, nonce)) {
      const response = NextResponse.json(
        { ok: false, error: "Invalid nonce" },
        { status: 400 },
      );
      clearNonce(response);
      return response;
    }

    if (!isAdmin(address)) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const normalizedAddress = normalizeAdminAddress(address);
    const message = `DexDuel Admin Login\nNonce: ${nonce}\nAddress: ${normalizedAddress}\nChain: one-testnet`;
    await verifyPersonalMessageSignature(new TextEncoder().encode(message), signature, {
      address: normalizedAddress,
    });

    const { token } = createSession(normalizedAddress);
    const response = NextResponse.json({
      ok: true,
      address: normalizedAddress,
    });
    setSessionCookie(response, token);
    clearNonce(response);

    return response;
  } catch (error) {
    console.error("[POST /api/auth/verify]", error);
    const response = NextResponse.json({ ok: false, error: String(error) }, { status: 401 });
    clearNonce(response);
    return response;
  }
}
