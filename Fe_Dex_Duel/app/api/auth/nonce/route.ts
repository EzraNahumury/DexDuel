import { NextResponse } from "next/server";
import { createNonce, setNonceCookie } from "@/src/server/auth/nonceStore";

export async function GET() {
  try {
    const nonce = createNonce();
    const response = NextResponse.json({ ok: true, nonce });
    setNonceCookie(response, nonce);
    return response;
  } catch (error) {
    console.error("[GET /api/auth/nonce]", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
