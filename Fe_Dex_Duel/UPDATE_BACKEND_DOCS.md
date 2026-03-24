# DexDuel Backend & Indexer Documentation

This document summarizes the custom backend integration created to synchronize the DexDuel Front-End (Next.js App Router) with the OneChain Testnet smart contracts using PostgreSQL and Prisma.

## ðŸŒŸ Overview

The backend uses a **CQRS (Command Query Responsibility Segregation)** pattern:
- **Commands (Writes)**: The Front-End (`@onelabs/dapp-kit`) sends transactions directly to the OneChain RPC using users' wallets. The server never holds private keys.
- **Queries (Reads)**: The custom Next.js backend reads data instantly from a PostgreSQL database, providing fast, filterable, and paginated APIs.
- **Synchronization**: A background worker (Indexer) constantly polls the blockchain for specific DexDuel Move events and materializes them into the PostgreSQL database.

Add tournament is on-chain only (source of truth). The backend only validates payloads and reads indexed data. Delete tournament is implemented as a soft delete in PostgreSQL (`Round.isHidden`) so on-chain history remains intact.

---

## ðŸ›  Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database ORM**: Prisma v7 (`@prisma/client`)
- **Database Engine**: PostgreSQL (Neon Serverless + `@prisma/adapter-pg`)
- **Runtime executor**: `tsx` (for the background Indexer worker)
- **Chain SDK**: `@onelabs/sui` & `@onelabs/dapp-kit`

---

## ðŸ— System Architecture

### 1. Database Schema (`prisma/schema.prisma`)
The schema maps Move objects and events to relational tables:
- `Round`: Materialized tournament data (`coinSymbol`, `status`, `upCount`, `totalUpStake`, etc.) plus soft delete fields (`isHidden`, `hiddenAt`, `hiddenReason`).
- `Prediction`: Individual player predictions (`direction`, `stakeRaw`, `isCorrect`).
- `RewardClaim`: Player reward withdrawals.
- `Score`: Total leaderboard points per player per season.
- `ChainEvent`: Raw, deduplicated blockchain log (prevents double-processing).
- `ChainCursor`: Stores the pagination cursor (`EventId`) for the indexer to resume safely after restarts.

### 2. The Indexer (`server/indexer/`)
A long-running Node.js process that polls `queryEvents` from OneChain.
- **`indexer.ts`**: The main loop. Polls 4 modules (`game_round`, `prediction`, `game_controller`, `leaderboard`) every 5 seconds.
- **`handlers.ts`**: Database transaction logic. Upserts materialized views based on event types (e.g., `RoundEnded` changes `Round.status` to `"ENDED"`).
- **`chainClient.ts`**: Singleton RPC client configuration.
- **`eventTypes.ts`**: Fully qualified Move event names to listen for.
- **`utils.ts`**: Utilities for parsing raw `parsedJson` data to JS types (e.g., parsing byte strings to `BTC`, converting u64 timestamps to JS Dates).

### 3. API Endpoints (`app/api/`)
Fast frontend-facing REST endpoints powered by Prisma.
- `GET /api/tournaments?status=ACTIVE&q=BTC&limit=20`
- `GET /api/tournaments/[roundId]`
- `GET /api/tournaments/[roundId]/predictions?limit=50`
- `GET /api/leaderboard?seasonId=1`
- `GET /api/health/db` (Simple health check)
- `GET /api/auth/nonce`
- `POST /api/auth/verify`
- `GET /api/admin/tournaments?includeHidden=1`
- `PATCH /api/admin/tournaments/[roundId]/hide`
- `POST /api/admin/tournaments/validate`
- `POST /api/admin/tournaments/create` (admin command: returns tx payload only)
- `POST /api/admin/tournaments/[roundId]/cancel` (admin command: UPCOMING only, returns tx payload only)

> **Note**: Because BigInt is not natively serializable in `Response.json()`, all `BigInt` database fields are converted to `.toString()` at the API layer.

### Command Env Vars
The admin command endpoints use these environment variables to build Move transaction payloads:
- `DEXDUEL_PACKAGE_ID` (required)
- `DEXDUEL_MODULE_NAME` (default: `dexduel`)
- `DEXDUEL_CREATE_FN` (default: `create_tournament`)
- `DEXDUEL_CANCEL_FN` (default: `cancel_tournament`)

### New Columns (Non-Destructive)
- `Round.chainRoundId` (unique on-chain ID mapping)
- `Round.roundNo` (local, sequence-backed ordering for UI)
- `Round.pairSymbol`
- `Season.seasonNo` (local, sequence-backed ordering for UI)
- `Season.chainSeasonNo` (optional on-chain season number)

Sequences are created explicitly:
- `season_no_seq`
- `round_no_seq`

Existing primary keys and relations are unchanged.

### Migration Preflight Checks
The `safe_offchain_ids` migration includes strict checks and will fail early if:
- `Round.roundId` is NULL or duplicated (used to backfill `chainRoundId`)
- `Round.coinSymbol` is NULL (would break `pairSymbol` NOT NULL)
- `Round.onChainRoundId` (if present) contains duplicates
- `Round.roundId` length is less than 3
- `Round.onChainRoundId` (if present) length is less than 3

If it fails, fix the data issues (or backfill a valid on-chain ID column) and re-run the migration.

---

## Admin Auth and Soft Delete

Admin-only actions use a server-side session cookie issued after a wallet signature check.

1. `GET /api/auth/nonce` returns a nonce (and stores it in an httpOnly cookie).
2. The admin wallet signs the nonce as a personal message.
3. `POST /api/auth/verify` with `{ address, signature, nonce }` verifies the signature and issues an httpOnly session cookie.

Admin allowlist is controlled by `ADMIN_ADDRESSES` (comma-separated, lowercase normalized).

Signed message format:
```
DexDuel Admin Login
Nonce: <nonce>
Address: <address>
Chain: one-testnet
```

Soft delete is implemented at the DB layer only:
- `PATCH /api/admin/tournaments/[roundId]/hide` sets `isHidden`, `hiddenAt`, `hiddenReason`.
- Hidden tournaments are excluded from public lists by default.
- Admins can include hidden records via `includeHidden=1`.

---

## ðŸš€ Running the System

To run the system locally, you need three separate terminals running simultaneously.

### Terminal 1: Next.js Dev Server
Runs the web app and the API endpoints.
```bash
npm run dev
```

### Terminal 2: Background Indexer Worker
Connects to OneChain, pulls events, and populates PostgreSQL.
```bash
npm run indexer:dev
```

### Terminal 3: Prisma Studio (Optional)
Visual database viewer.
```bash
npx prisma studio
```
*(Available at http://localhost:5555)*

---

## Environment Configuration

- `ADMIN_ADDRESSES=0xabc,0xdef`
- `ADMIN_SESSION_SECRET=your-long-random-secret`

---

## Testing Admin Hide/Unhide

Step 1: get nonce
```bash
curl "http://localhost:3000/api/auth/nonce"
```

Step 2: sign the message (manual wallet step)

Step 3: verify signature and establish session cookie
```bash
curl -X POST "http://localhost:3000/api/auth/verify" \
  -H "Content-Type: application/json" \
  --cookie "dd_admin_nonce=YOUR_NONCE_COOKIE" \
  -d '{"address":"0xabc","signature":"0xSIG","nonce":"NONCE_FROM_STEP_1"}'
```

Example hide with `curl` (requires session cookie):
```bash
curl -X PATCH "http://localhost:3000/api/admin/tournaments/1/hide" \
  -H "Content-Type: application/json" \
  --cookie "dd_admin_session=YOUR_SESSION_COOKIE" \
  -d '{"hidden":true,"reason":"duplicate"}'
```

Unhide:
```bash
curl -X PATCH "http://localhost:3000/api/admin/tournaments/1/hide" \
  -H "Content-Type: application/json" \
  --cookie "dd_admin_session=YOUR_SESSION_COOKIE" \
  -d '{"hidden":false}'
```

PowerShell equivalents:
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/auth/nonce" -SessionVariable session
```
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/verify" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"address":"0xabc","signature":"0xSIG","nonce":"NONCE_FROM_STEP_1"}' `
  -WebSession $session
```
```powershell
Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/admin/tournaments/1/hide" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"hidden":true,"reason":"duplicate"}' `
  -WebSession $session
```

Confirm hidden tournaments are excluded from the public list:
```bash
curl "http://localhost:3000/api/tournaments"
```

Admin-only include hidden (requires session cookie):
```bash
curl "http://localhost:3000/api/tournaments?includeHidden=1" \
  --cookie "dd_admin_session=YOUR_SESSION_COOKIE"
```

---

## ðŸž Error Handling & Resilience
- **Prisma v7 Compliance**: Uses the `@prisma/adapter-pg` driver adapter. Database URLs are passed securely at runtime via connection pooling.
- **Safe Restarts**: The Indexer saves the latest `EventId` to `ChainCursor`. If it crashes or stops, it resumes from the exact last block it saw.
- **Idempotency**: All database writes use `upsert` or rely on `UNIQUE(eventType, txDigest, eventSeq)` constraints to prevent duplicate data if the indexer reads the same page twice.
