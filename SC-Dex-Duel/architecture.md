# Architecture — No-Loss Casual MVP (OneChain + Base)

## Chain Roles
- OneChain (Move): source of truth untuk game state (join, settle, claim status)
- Base (EVM): source of truth untuk dana yield (Vault + lending testnet)
- Relayer (MVP): bridge sementara (event-driven) OneChain ↔ Base

## Assets
- OneChain gameplay token: Mock USDT (decimals = 6)
- Base vault asset: stable testnet yang didukung lending protocol di Base Sepolia (TBD)
- Lending protocol: Aave V3 testnet (Base Sepolia)

> MVP NOTE: deposit di OneChain dan deposit di Base adalah **mirror accounting** via relayer
> (karena token OneChain tidak otomatis bisa digunakan di lending Base).

## No-Loss Model
- Principal: 100% kembali ke peserta
- Prize: RealYield (Base lending) + Demo Booster (top-up)
- RealYield: selisih nilai Vault vs total principal pada waktu settle
- Booster: top-up fixed/limited per round untuk demo agar prize terasa

## Responsibilities
### OneChain
- menentukan participants, winners, payout amounts (refund & prize allocation)
- emit events untuk relayer

### Base Vault
- menyimpan dana, invest ke lending, withdraw dana
- menjalankan payout sesuai instruksi relayer (tanpa game logic)

## Amount Format
- Semua amount dalam event OneChain menggunakan decimals 6 (Mock USDT units)

## Event Contract Requirements (OneChain emits)
### JoinEvent
- tournament_id
- round_id
- user (onechain address)
- amount (u64, decimals 6)
- ts

### SettleEvent (actionable)
Opsi A (1 event berisi list payout):
- tournament_id
- round_id
- ts
- refunds: list of (user, principal_amount)
- prizes: list of (user, prize_amount)

Opsi B (emit per user, lebih mudah untuk listener):
- RefundEvent(tournament_id, round_id, user, principal_amount, ts)
- PrizeEvent(tournament_id, round_id, user, prize_amount, ts)

## Identity Mapping Decision
MVP uses: relayer db mapping
- user submit Base address sekali (off-chain)
- relayer simpan mapping: onechain_user → base_address
- payout di Base dikirim ke base_address tsb

## Safety / Guardrails (MVP)
- rate limit create tournament (per address per X menit)
- (optional recommended) create fee / stake kecil untuk anti-spam
- cap booster per round
- pause switch
- idempotency: relayer memproses settle berdasarkan (tournament_id, round_id) sekali saja