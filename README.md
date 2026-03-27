# DexDuel

**Decentralized Lossless Price Prediction Game on OneChain**

DexDuel is a full-stack GameFi platform where players stake USDT to predict whether a cryptocurrency's price will go UP or DOWN. Winners share the yield from the prize pool, while losers always get 100% of their stake back — zero principal risk.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Smart Contracts](#smart-contracts)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Event Indexer](#event-indexer)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

### How It Works

1. **Admin creates a tournament** — sets coin pair (e.g. BTC/USD), entry fee, start/end time
2. **Players join** — stake USDT and predict UP or DOWN
3. **Tournament ends** — admin provides the closing price
4. **Settlement** — system determines the winning direction
   - All participants receive 100% of their principal back (lossless)
   - Top 3 correct predictors share the yield pool:
     - Rank 1: 50%
     - Rank 2: 30%
     - Rank 3: 20%
   - 10% admin fee is deducted from the pool

### Key Features

- **Lossless model** — losers always get their full stake back
- **Fully on-chain** — all game state lives in Move smart contracts on OneChain
- **Real-time price charts** — interactive candlestick charts via Finnhub
- **Leaderboard & scoring** — seasonal rankings with win streaks and early prediction bonuses
- **Faucet** — claim 100 USDT (testnet) for free, unlimited times
- **3D animations** — Three.js + GSAP powered visuals
- **CQRS indexer** — background service that syncs blockchain events to PostgreSQL

---

## Architecture

```
                          +------------------+
                          |   OneChain       |
                          |   (Move SC)      |
                          +--------+---------+
                                   |
                    emits events    |   transactions
                    (RoundCreated,  |   (join_game,
                     PredictionRec  |    claim_rewards)
                     ...)           |
               +--------------------+--------------------+
               |                                         |
    +----------v-----------+              +--------------v-----------+
    |   Event Indexer      |              |   Next.js Frontend       |
    |   (Node.js)          |              |   (App Router)           |
    |                      |              |                          |
    |   Polls every 5s     |              |   Pages:                 |
    |   Deduplicates       |              |   / (landing)            |
    |   Materializes to DB |              |   /tournaments           |
    +----------+-----------+              |   /tournaments/:id       |
               |                          |   /arena (admin)         |
               |                          |   /leaderboard           |
    +----------v-----------+              |   /profile               |
    |   PostgreSQL         <--------------+                          |
    |   (Prisma ORM)       |  API routes  +--------------------------+
    +----------------------+
```

The system follows a **CQRS pattern**:
- **Write path**: Frontend signs transactions -> OneChain blockchain
- **Read path**: Indexer polls blockchain events -> PostgreSQL -> API routes -> Frontend

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | TailwindCSS v4, CSS Variables |
| **Animations** | GSAP, Framer Motion, Three.js, React Three Fiber |
| **Blockchain** | OneChain Testnet (Sui-compatible), Move language |
| **Wallet** | @onelabs/dapp-kit, @onelabs/sui |
| **Database** | PostgreSQL (Neon.tech or local) |
| **ORM** | Prisma v7 |
| **State** | TanStack React Query |
| **Market Data** | Finnhub API (server-side proxy) |
| **EVM Vault** | Solidity (Foundry), OpenZeppelin — Base network |

---

## Project Structure

```
DexDuel/
├── Fe_Dex_Duel/                 # Main application (Next.js + backend)
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── providers.tsx        # React/wallet providers
│   │   ├── tournaments/
│   │   │   ├── page.tsx         # Tournament list
│   │   │   └── [id]/page.tsx    # Tournament detail + join
│   │   ├── arena/page.tsx       # Admin: create & manage tournaments
│   │   ├── leaderboard/page.tsx # Global rankings
│   │   ├── profile/page.tsx     # Personal stats
│   │   └── api/                 # API routes (see API Reference)
│   │
│   ├── components/
│   │   ├── CandlestickChart.tsx # GSAP-animated OHLCV chart
│   │   ├── Chart3DHero.tsx      # 3D chart visualization
│   │   ├── CryptoIcon3D.tsx     # 3D crypto icons (Three.js)
│   │   ├── FaucetButton.tsx     # "Get 100 USDT" button
│   │   ├── Navbar.tsx           # Navigation bar
│   │   ├── CountdownTimer.tsx   # Live countdown
│   │   └── AdminTournamentForm.tsx
│   │
│   ├── hooks/
│   │   ├── useOnChainTournaments.ts  # Fetch tournaments from chain
│   │   ├── useJoinGame.ts            # Join + predict
│   │   ├── useClaimReward.ts         # Claim rewards
│   │   ├── useFaucet.ts              # Claim USDT
│   │   ├── useUSDTBalance.ts         # Wallet balance
│   │   ├── useLeaderboard.ts         # Rankings
│   │   ├── useMarketData.ts          # Price data
│   │   ├── useCreateTournament.ts    # Admin: create
│   │   ├── useStartRound.ts          # Admin: start
│   │   └── useCompleteGame.ts        # Admin: settle
│   │
│   ├── lib/
│   │   ├── constants.ts         # Package IDs, object IDs
│   │   ├── transactions.ts      # Move transaction builders
│   │   ├── db.ts                # Prisma client
│   │   └── api.ts               # API client utilities
│   │
│   ├── src/
│   │   ├── config/onechain.ts   # RPC & contract config
│   │   ├── lib/onechain/        # Chain client, events, tx utils
│   │   ├── server/auth/         # Nonce, session, admin middleware
│   │   └── types/onechain.ts    # TypeScript types
│   │
│   ├── server/indexer/          # Event indexer (background service)
│   │   ├── indexer.ts           # Main polling loop
│   │   ├── handlers.ts          # Event -> DB handlers
│   │   ├── eventTypes.ts        # Event type constants
│   │   └── chainClient.ts       # RPC client
│   │
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/          # SQL migrations
│   │
│   └── postman/                 # API collection for testing
│
├── SC-Dex-Duel/                 # Move smart contracts
│   ├── sources/
│   │   ├── usdt.move            # Mock USDT token + faucet
│   │   ├── game_round.move      # Tournament round logic
│   │   ├── game_controller.move # Game lifecycle orchestration
│   │   ├── prediction.move      # Prediction recording & results
│   │   └── leaderboard.move     # Scoring & seasonal rankings
│   └── tests/                   # Move unit tests
│
├── onechain-evm-vault/          # EVM vault (Solidity/Foundry)
│   ├── src/Vault.sol            # Cross-chain vault contract
│   ├── src/MockUSDC.sol         # Mock USDC for testing
│   ├── script/DeployVault.s.sol # Deployment script
│   └── test/Vault.t.sol         # Forge tests
│
├── dexduel-landing/             # Marketing landing page (Next.js)
└── dexduel-docs/                # Documentation site (React + Vite)
```

---

## Smart Contracts

Deployed on **OneChain Testnet** (Sui-compatible). Written in Move.

### Modules

| Module | Purpose |
|--------|---------|
| `usdt` | Mock USDT token (6 decimals). Faucet gives 100 USDT per claim. |
| `game_round` | Round data structure, treasury management, lifecycle events |
| `game_controller` | Orchestrates create -> start -> join -> complete -> claim flow |
| `prediction` | Records player predictions (UP/DOWN), sets results after settlement |
| `leaderboard` | Per-season scoring: +10 win, +5 streak, +3 early bonus |

### Contract Addresses (Testnet)

| Object | Address |
|--------|---------|
| Package | `0xfcb745f20df975c8436ee5ce22c51b389545ffa6f0ac53a435bfdcf2dc1de64d` |
| Faucet | `0xf1bbfbbaae6f9f6e8c88755072f391656538a685caf3f189d5263ab4a24fc1d9` |
| Treasury | `0x8d900bcfd26c3f6866af28f2707bf93b2eb71448c545cead723640df2590d04e` |
| Clock | `0x6` (system object) |

### Game Lifecycle

```
create_game_session()          Admin creates round + prediction registry
        |
   start_game()                Admin sets start price, round goes LIVE
        |
   join_game()                 Players stake USDT + predict UP/DOWN
        |
  complete_game()              Admin provides end price, determines winners
        |
  claim_rewards()              Players claim principal + yield (if winner)
```

### Direction Constants

```
UP   = 1    (predict price goes up)
DOWN = 2    (predict price goes down)
```

---

## Database Schema

PostgreSQL managed via Prisma. Key models:

### Round
Represents a tournament session.

| Field | Type | Description |
|-------|------|-------------|
| `roundId` | String | On-chain object address |
| `pairSymbol` | String | e.g. "BTC/USD" |
| `coinSymbol` | String | e.g. "BTC" |
| `entryFee` | BigInt | Stake amount in USDT units |
| `startTime` / `endTime` | DateTime | Tournament window |
| `priceStart` / `priceEnd` | BigInt | Opening/closing prices |
| `winnerDir` | Int | 1=UP, 2=DOWN, 0=tie |
| `status` | Enum | UPCOMING, LIVE, FINISHED, CANCELED, SETTLED |
| `totalParticipants` | Int | Player count |
| `upCount` / `downCount` | Int | Prediction distribution |
| `prizePool` | BigInt | Winnable yield amount |
| `isHidden` | Boolean | Soft delete flag |

### Prediction
Individual player predictions.

| Field | Type | Description |
|-------|------|-------------|
| `roundId` | String | FK to Round |
| `player` | String | Wallet address |
| `direction` | Int | 1=UP, 2=DOWN |
| `stakeRaw` | BigInt | Amount wagered |
| `isEarly` | Boolean | Predicted within early window |
| `isCorrect` | Boolean | Set after settlement |
| `rank` | Int | 1st, 2nd, 3rd (winners only) |

### Score
Per-season per-player scoring.

| Field | Type | Description |
|-------|------|-------------|
| `seasonId` | BigInt | Season identifier |
| `player` | String | Wallet address |
| `total` | BigInt | Total points |
| `streak` | BigInt | Current win streak |

### Other Models
- **RewardClaim** — payout records (principal + reward)
- **Season** — tournament grouping
- **ScoreEvent** — score change history
- **ChainEvent** — raw indexed blockchain events (deduplication)
- **ChainCursor** — indexer pagination state

---

## API Reference

### Public Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tournaments` | List tournaments (paginated, filterable) |
| GET | `/api/tournaments/:roundId` | Tournament detail |
| GET | `/api/tournaments/:roundId/predictions` | Predictions for a tournament |
| GET | `/api/leaderboard` | Season leaderboard |
| GET | `/api/rounds` | All rounds |
| GET | `/api/rounds/price` | Price data for rounds |
| GET | `/api/me` | Current user profile |
| GET | `/api/health/db` | Database health check |

### Market Data (Finnhub Proxy)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/market/quote` | Current price quote |
| GET | `/api/market/candles` | OHLCV candlestick data |
| GET | `/api/market/symbols` | Tradeable crypto symbols |

### Authentication

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/auth/nonce` | Request signing nonce |
| POST | `/api/auth/verify` | Verify wallet signature, create session |

### Admin (Requires Auth)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/admin/tournaments/create` | Create tournament |
| POST | `/api/admin/tournaments/validate` | Validate tournament params |
| GET | `/api/admin/tournaments` | List all (incl. hidden) |
| POST | `/api/admin/tournaments/:roundId/hide` | Soft-delete tournament |
| POST | `/api/admin/tournaments/:roundId/cancel` | Cancel tournament |

---

## Authentication

Admin authentication uses a **nonce-signature** flow:

1. Frontend requests a nonce from `GET /api/auth/nonce`
2. Server generates random nonce, stores in httpOnly cookie
3. User signs `nonce + address` with their wallet
4. Frontend sends `{ address, signature, nonce }` to `POST /api/auth/verify`
5. Server verifies signature via `@onelabs/sui`
6. Server checks address against `ADMIN_ADDRESSES` allowlist
7. Server issues a signed JWT as httpOnly `dd_admin_session` cookie

All admin API routes validate this session cookie before processing requests.

---

## Event Indexer

The indexer is a **mandatory background process** that bridges on-chain state to the database.

### How It Works

```
OneChain RPC  --[poll every 5s]-->  Indexer  --[upsert]-->  PostgreSQL
```

1. Polls blockchain events from the last known cursor
2. Deduplicates using the `ChainEvent` table (eventType + txDigest + eventSeq)
3. Dispatches to typed handlers that upsert into the appropriate tables
4. Updates the `ChainCursor` for the next poll cycle

### Indexed Events

| Event | Target Table |
|-------|-------------|
| `RoundCreated`, `TournamentCreated` | Round |
| `TournamentStarted`, `RoundEnded`, `RoundSettled`, `RoundCancelled` | Round |
| `PredictionRecorded`, `PredictionResultSet` | Prediction |
| `RewardClaimed` | RewardClaim |
| `ScoreUpdated`, `SeasonEnded` | Score, ScoreEvent |

### Running the Indexer

```bash
cd Fe_Dex_Duel
pnpm run indexer:dev
```

Without the indexer running, the frontend will not display new tournaments or updated game statuses.

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **pnpm** (recommended) or npm
- **PostgreSQL** database (local or [Neon.tech](https://neon.tech))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd DexDuel/Fe_Dex_Duel

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env with your database URL and config (see Environment Variables)

# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate deploy
```

### Running (Development)

You need **3 terminal windows**:

**Terminal 1 — Frontend**
```bash
pnpm run dev
# http://localhost:3000
```

**Terminal 2 — Prisma Studio** (optional, database GUI)
```bash
pnpm prisma studio
# http://localhost:5555
```

**Terminal 3 — Event Indexer** (required)
```bash
pnpm run indexer:dev
```

### Using the App

1. Open `http://localhost:3000`
2. Connect your OneChain-compatible wallet
3. Click "Get 100 USDT" (faucet) to get testnet tokens
4. Browse `/tournaments` and join a tournament
5. Predict UP or DOWN and stake your USDT
6. Wait for the tournament to end
7. Claim your rewards if you predicted correctly

---

## Environment Variables

Create a `.env` file in `Fe_Dex_Duel/`:

```bash
# === Blockchain ===
NEXT_PUBLIC_PACKAGE_ID=0xfcb745f20df975c8436ee5ce22c51b389545ffa6f0ac53a435bfdcf2dc1de64d
NEXT_PUBLIC_ONECHAIN_RPC=https://rpc-testnet.onelabs.cc:443

# === Database (required) ===
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dexduel"

# === Admin Authentication ===
ADMIN_ADDRESSES=0xabc123,0xdef456     # Comma-separated admin wallet addresses
ADMIN_SESSION_SECRET=replace-with-random-secret

# === Market Data ===
FINNHUB_API_KEY=your-finnhub-api-key  # For real-time price data

# === Indexer ===
INDEXER_POLL_INTERVAL_MS=5000          # Poll interval (default: 5000ms)
```

---

## Deployment

### Frontend (Vercel / Node.js)

```bash
cd Fe_Dex_Duel
pnpm run build    # Runs prisma generate + next build
pnpm start        # Production server
```

### Indexer (Separate Process)

The indexer must run as a separate long-lived process alongside the frontend:

```bash
pnpm run indexer:dev
```

In production, use a process manager (PM2, systemd, Docker) to keep the indexer alive.

### Smart Contracts

Already deployed on OneChain Testnet. To redeploy:

```bash
cd SC-Dex-Duel
# Use Sui CLI to publish
sui client publish --gas-budget 500000000
```

### EVM Vault (Optional)

```bash
cd onechain-evm-vault
forge build
forge test
forge script script/DeployVault.s.sol --rpc-url <BASE_RPC> --private-key <KEY> --broadcast
```

---

## License

This project is private and not licensed for public distribution.
