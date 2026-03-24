This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- pnpm (recommended) or npm
- PostgreSQL database (e.g., Neon.tech)

### 2. Environment Setup
Create a `.env` file in the root directory and configure the following:
```bash
# Blockchain (OneChain Testnet)
NEXT_PUBLIC_PACKAGE_ID=0xfcb745f20df975c8436ee5ce22c51b389545ffa6f0ac53a435bfdcf2dc1de64d
NEXT_PUBLIC_ONECHAIN_RPC=https://rpc-testnet.onelabs.cc:443

# Database
DATABASE_URL="your-postgresql-connection-string"

# Admin
ADMIN_ADDRESS=0x...
ADMIN_SESSION_SECRET=your-random-secret
```

### 3. Database Initialization
Before running the app, generate the Prisma client:
```bash
pnpm prisma generate
```

### 4. Running the Application
You need **three** terminal windows open:

**Terminal 1: Frontend Development**
```bash
pnpm run dev
```

**Terminal 2: Prisma Studio (Database GUI)**
```bash
pnpm prisma studio
```
> Opens a visual database editor at [http://localhost:5555](http://localhost:5555)

**Terminal 3: On-Chain Event Indexer (MANDATORY)**
```bash
pnpm run indexer:dev
```

> [!IMPORTANT]
> The **Indexer** is responsible for listening to blockchain events (Tournament Created, Joined, etc.) and saving them to your database. Without the indexer running, your website will not show new tournaments or updated game statuses.

## Features
- **Real-time Charting**: Interactive candlestick charts using GSAP and Framer Motion.
- **On-chain Arena**: Create and join price prediction tournaments.
- **Automated Sync**: Background indexer ensures database consistency with blockchain state.

## Architecture
- **Frontend**: Next.js 16 (App Router)
- **Smart Contract**: Move (OneChain/Sui)
- **Database**: PostgreSQL with Prisma ORM
- **Indexer**: Custom Node.js polling service
