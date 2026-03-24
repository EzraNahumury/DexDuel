import { setTimeout as delay } from "node:timers/promises";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_COOKIE = process.env.ADMIN_COOKIE ?? "";
const CHAIN_ROUND_ID = process.env.CHAIN_ROUND_ID ?? "";

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore parse errors
  }
  return { res, text, json };
}

function printResult(title: string, res: Response, body: unknown | string) {
  console.log("\n===", title, "===");
  console.log("Status:", res.status);
  if (body) {
    console.log(typeof body === "string" ? body : JSON.stringify(body, null, 2));
  }
}

async function main() {
  const list = await request("/api/tournaments");
  printResult("GET /api/tournaments", list.res, list.json ?? list.text);

  if (!ADMIN_COOKIE) {
    console.log("\nADMIN_COOKIE not set, skipping admin calls.");
    process.exit(0);
  }

  const createBody = {
    pairSymbol: "BTC/USDT",
    startTimeMs: 1760000000000,
    endTimeMs: 1760000300000,
    seasonNo: 1,
  };

  const create = await request("/api/admin/tournaments/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ADMIN_COOKIE,
    },
    body: JSON.stringify(createBody),
  });
  printResult("POST /api/admin/tournaments/create", create.res, create.json ?? create.text);

  if (!CHAIN_ROUND_ID) {
    console.log("\nCHAIN_ROUND_ID not set, skipping cancel tests.");
    process.exit(0);
  }

  const cancel = await request(`/api/admin/tournaments/${CHAIN_ROUND_ID}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ADMIN_COOKIE,
    },
  });
  printResult("POST /api/admin/tournaments/[roundId]/cancel", cancel.res, cancel.json ?? cancel.text);

  await delay(250);
  const cancelGuard = await request(`/api/admin/tournaments/${CHAIN_ROUND_ID}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ADMIN_COOKIE,
    },
  });
  printResult("Guard re-check /cancel", cancelGuard.res, cancelGuard.json ?? cancelGuard.text);

  if (![200, 400].includes(cancelGuard.res.status)) {
    console.error("Unexpected status from cancel guard:", cancelGuard.res.status);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});