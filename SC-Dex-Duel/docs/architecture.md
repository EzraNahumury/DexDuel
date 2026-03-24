# Architecture — No-Loss Casual MVP (OneChain + Base)

## Overview

DexDuel is a lossless prediction game. Players bet on crypto price direction (UP/DOWN).
- **Principal is always returned 100%** to all participants.
- **Prize = Real Yield** sourced from a Base lending protocol (Aave V3 testnet).
- A Demo Booster (small fixed top-up per round) bridges the yield gap for short rounds.

---

## Chain Roles

| Chain | Role |
|---|---|
| **OneChain (Move)** | Source of truth for game state: join, settle, rank, claim status |
| **Base (EVM)** | Source of truth for funds: Vault + Aave V3 lending (testnet) |
| **Relayer (MVP)** | Off-chain bridge between OneChain events → Base Vault actions |

---

## Assets

- **OneChain gameplay token**: Mock USDT (`decimals = 6`)
- **Base vault asset**: Testnet stable supported by Aave V3 on Base Sepolia (TBD: USDC/DAI)
- **Lending protocol**: Aave V3 testnet (Base Sepolia)

> **MVP NOTE:** Deposit on OneChain and deposit on Base are **mirror accounting** via relayer.
> Token on OneChain cannot be directly bridged to Base yet. The Relayer handles the accounting.

---

## No-Loss Model

| Component | Description |
|---|---|
| **Principal** | 100% returned to every participant |
| **Prize Pool** | RealYield (Base lending APY) + Demo Booster (fixed top-up) |
| **RealYield** | Difference between Vault value at settle vs. total principal at join |
| **Booster** | Fixed/limited top-up per round (for hackathon demo feel) |

---

## Responsibilities

### OneChain (Move Smart Contract)
- Validates participants and locks their funds temporarily.
- Determines winners (UP/DOWN direction), ranks (1st, 2nd, 3rd).
- Emits **Relayer Events** for every join, refund, and prize.
- Is the single source of truth for game logic.

### Base Vault (EVM Smart Contract)
- Holds the mirrored principal in Aave V3 (earning real yield).
- Executes payouts (refund + prize) based on Relayer instructions.
- Has **no game logic** — it only executes what the Relayer instructs.

### Relayer (Off-chain Bridge, MVP)
- Listens to OneChain events.
- Mirrors join amounts to Base Vault.
- Triggers Base Vault withdraw + transfer on RefundEvent and PrizeEvent.
- Stores the identity mapping: `onechain_address → base_address` (off-chain DB).

---

## Round ID & Idempotency

Each round has a **unique `round_id`** (u64, counter per tournament/season).
- This is set at `create_game_session` time and stored inside the `Round` object.
- Relayer uses `(tournament_id, round_id)` as the composite key to ensure
  each settle is processed **exactly once** (idempotent).

---

## Relayer Event Specifications (OneChain emits)

All amounts are in **Mock USDT units (`decimals = 6`)** — no conversion needed.

> **Claim-driven model:** `RefundEvent` dan `PrizeEvent` dipancarkan saat user claim
> (`claim_rewards`), bukan saat settle. Relayer harus siap menerima event ini kapan saja
> setelah round selesai, sesuai kapan masing-masing user memanggil claim.

### 1. JoinEvent
Emitted: when user successfully joins a round and funds are locked in the contract.

```
JoinEvent {
    tournament_id: u64,   // season_id
    round_id:      u64,   // unique round identifier
    user:          address,
    amount:        u64,   // in Mock USDT units (decimals 6)
    ts:            u64,   // block timestamp in ms
}
```

**Relayer action:** Mirror-deposit `amount` to Base Vault on behalf of `user`.

---

### 2. RefundEvent (per user, after settle)
Emitted: when a user calls `claim_rewards` — principal returned (claim-driven relayer).

```
RefundEvent {
    tournament_id:    u64,
    round_id:         u64,
    user:             address,
    principal_amount: u64,  // in Mock USDT units (decimals 6)
    ts:               u64,
}
```

**Relayer action:** Withdraw `principal_amount` from Base Vault, send to `user`'s Base address.

---

### 3. PrizeEvent (per winner, rank 1-3 only)
Emitted: when a top-3 winner calls `claim_rewards` — prize emitted alongside RefundEvent (claim-driven relayer). Only emitted if prize > 0.

```
PrizeEvent {
    tournament_id: u64,
    round_id:      u64,
    user:          address,
    prize_amount:  u64,  // in Mock USDT units (decimals 6)
    ts:            u64,
}
```

**Relayer action:** Transfer `prize_amount` (from yield) from Base Vault to `user`'s Base address.

---

## Identity Mapping

MVP approach: **off-chain mapping stored by Relayer**.

1. User submits their Base address **once** via the frontend (off-chain).
2. Relayer stores mapping: `onechain_address → base_address` in its own DB.
3. On RefundEvent / PrizeEvent, Relayer looks up `user` → `base_address` and sends funds.

> No on-chain storage needed for identity mapping in MVP.

---

## Safety / Guardrails (MVP)

| Guardrail | Description |
|---|---|
| **Rate limit** | Limit tournament creation per address per X minutes (off-chain or on-chain counter) |
| **Create fee** | Optional small stake to prevent spam (future) |
| **Booster cap** | Max booster amount per round |
| **Pause switch** | Admin can pause Relayer / Vault in emergency |
| **Idempotency** | Relayer tracks processed `(tournament_id, round_id)` to avoid double-payout |
| **Prediction Lock** | Predictions locked after `prediction_end_time` (sniping guard) |

---

## Implementation Status

| Component | Status |
|---|---|
| OneChain: Join/Settle/Claim logic | ✅ Done |
| OneChain: JoinEvent | ✅ Done |
| OneChain: RefundEvent | ✅ Done |
| OneChain: PrizeEvent | ✅ Done |
| OneChain: Prediction Lock Period | ✅ Done |
| OneChain: Leaderboard & Streaks | ✅ Done |
| Base: Vault + Aave integration | 🚧 In progress |
| Relayer: Event listener | 🚧 In progress |
| Identity mapping (off-chain DB) | 🚧 In progress |
