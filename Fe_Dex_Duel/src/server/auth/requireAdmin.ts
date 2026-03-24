import type { NextRequest } from "next/server";
import { isAdmin } from "./adminAllowlist";
import { getSessionFromRequest } from "./session";

type AdminCheck =
  | { ok: true; address: string }
  | { ok: false; status: number; error: string };

export function getAdminAddress(req: NextRequest): string | null {
  const session = getSessionFromRequest(req);
  if (!session) return null;
  if (!isAdmin(session.address)) return null;
  return session.address;
}

export function requireAdmin(req: NextRequest): AdminCheck {
  if (!process.env.ADMIN_SESSION_SECRET) {
    return { ok: false, status: 500, error: "ADMIN_SESSION_SECRET is not configured" };
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!isAdmin(session.address)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, address: session.address };
}
