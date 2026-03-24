You are a senior full-stack engineer. I have a Next.js 16 App Router project (DexDuel) with Prisma + Neon PostgreSQL already working, plus a background indexer that materializes on-chain Move events into PostgreSQL (CQRS: FE writes on-chain, BE reads from DB). I now need to implement “Add Tournament” and “Delete Tournament” features correctly.

IMPORTANT CONSTRAINTS

- The blockchain (OneChain / Move) is the source of truth for tournaments/rounds.
- We must NOT hard-delete tournament data that originates from on-chain events.
- “Delete Tournament” should be implemented as a DB-level soft delete (hide/archive) so history remains and indexer continues to work.
- Use Next.js App Router only (no pages/api).
- Do NOT introduce private keys or server-side signing.
- Admin-only actions must be protected: do not rely on client localStorage. Add proper server-side admin authorization.

CURRENT STATE

- DB health endpoint works: GET /api/health/db returns ok:true
- Indexer polls Move events and upserts tables: Round, Prediction, RewardClaim, Score, etc.
- FE currently builds and submits admin transactions with @onelabs/sui/transactions (Transaction).

TASKS

A) Soft Delete / Archive Tournament (DB)

1. Update Prisma schema:
   - Add fields to Round model:
     - isHidden Boolean @default(false)
     - hiddenAt DateTime?
     - hiddenReason String?
   - Add indexes if needed (isHidden, status, startTime).
2. Create a migration (npx prisma migrate dev --name round_soft_delete).

B) Admin Authorization (Server-side)
Implement admin auth in a minimal, secure way:
Option 1 (preferred): “Sign-in with wallet signature”

- Create GET /api/auth/nonce that returns a nonce string and stores it (DB or signed cookie).
- Create POST /api/auth/verify that accepts { address, signature, nonce } and verifies the signature.
- If valid, set an httpOnly session cookie (or JWT).
- Create a helper to read session and extract address on server routes.
- Admin allowlist:
  - Use an env var ADMIN_ADDRESSES="0xabc,0xdef" (server-only).
  - Normalize lowercase and compare.
- Admin routes must reject requests without valid session and allowlisted address.

(If signature verification is too hard with current libs, implement a temporary MVP guard that checks an x-admin-address header against the allowlist, but clearly mark it as TEMP and keep route structure compatible to upgrade later.)

C) Admin API Endpoints

1. PATCH /api/admin/tournaments/[roundId]/hide
   Body: { hidden: boolean, reason?: string }
   - Requires admin auth.
   - Sets Round.isHidden, hiddenAt, hiddenReason accordingly.
   - Must not delete any rows.
   - Return updated Round as JSON (convert BigInt to string if needed).
2. GET /api/admin/tournaments?includeHidden=1
   - Requires admin auth.
   - Returns tournaments including hidden ones.

D) Public Tournament Listing Update

1. Update GET /api/tournaments to exclude hidden tournaments by default:
   - where: { isHidden: false }
   - If query param includeHidden=1 and admin session exists, include hidden.
2. Ensure the API layer converts BigInt fields to strings before Response.json().

E) Add Tournament (Create Tournament) UX flow
We create tournaments ON-CHAIN (source of truth). The DB is filled by the indexer (RoundCreated, GameSessionCreated, etc).
Implement a clean “Add tournament” flow without server signing:

Option A (recommended MVP):

- FE continues building and executing the tx using buildCreateTournamentTx.
- Backend provides:
  - POST /api/admin/tournaments/validate (admin-only)
    - Validates payload: roundId, seasonId, coinSymbol, start/end time, entryFeeRaw, earlyWindowMinutes.
    - Checks time sanity and basic bounds.
    - Returns { ok: true } if valid.
- After tx success, FE refreshes from GET /api/tournaments (DB populated by indexer).

Option B (optional improvement):

- Backend returns a “transaction plan” payload that FE uses to build the Transaction consistently (still signed client-side).

Implement Option A now.

F) Documentation Update
Update docs (DexDuel Backend & Indexer Documentation) to include:

- “Add tournament is on-chain only; DB is indexed.”
- “Delete tournament is soft delete (isHidden) only.”
- Admin auth approach and endpoints.

DELIVERABLES

- Prisma schema changes + migration
- New App Router routes for auth + admin hide/unhide + validate + updated listing behavior
- Utility for BigInt JSON serialization
- Clear run/test instructions:
  - How to set ADMIN_ADDRESSES env
  - How to test hide/unhide with curl/Invoke-RestMethod
  - How to confirm hidden tournaments are excluded from public list

IMPLEMENTATION NOTES

- Place server code under src/app/api/... and src/lib/... as appropriate.
- Use robust error handling and return JSON { ok:false, error } with proper status codes.
- Normalize addresses to lowercase.
- Do not break the existing indexer.

Now implement all of the above in the repository.
