# Cross-Chain Vault

DexDuel introduces a cross-chain EVM Vault mechanism that enables real yield generation from pooled player stakes. Unlike prediction platforms where prizes come from other players' losses, DexDuel generates actual returns through DeFi protocols on EVM chains.

## Architecture

The Vault is a Solidity smart contract deployed on **Base** (EVM-compatible chain), designed to work in conjunction with the Move game contracts on OneChain through a relayer bridge.

```
OneChain (Sui VM)              Relayer Bridge              Base (EVM)
┌──────────────────┐        ┌──────────────┐        ┌──────────────────┐
│  Game Contracts  │──────→ │   Relayer    │──────→ │    Vault.sol     │
│                  │        │  (off-chain) │        │                  │
│  JoinEvent       │───→    │  Listens for │───→    │  depositFor()    │
│  RefundEvent     │───→    │  on-chain    │───→    │  refund()        │
│  PrizeEvent      │───→    │  events      │───→    │  payPrize()      │
└──────────────────┘        └──────────────┘        └──────────────────┘
```

## How It Works

### Deposit Mirroring
When a player joins a round on OneChain, the game contract emits a `JoinEvent`. The relayer detects this event and calls `depositFor()` on the Base Vault, mirroring the deposit on the EVM side.

### Yield Generation
While funds are held in the Vault during the tournament window, they can be deployed into yield-generating DeFi protocols. The Vault architecture includes hooks for Aave V3 integration:
- Deposited tokens are supplied to Aave's lending pool
- Interest accrues during the tournament window
- Yield is withdrawn when the round settles

### Settlement Distribution
After a round ends:
- **Refund**: All participants receive their principal back via `refund()` calls
- **Prize**: Top 3 winners receive their prize share via `payPrize()` calls
- **Booster**: Additional incentive prizes can be distributed via `payBoosterPrize()`

## Vault Contract Features

| Function | Access | Description |
|----------|--------|-------------|
| `depositFor()` | Operator | Mirror-deposit for a OneChain user |
| `refund()` | Operator | Return principal to a Base recipient |
| `payPrize()` | Operator | Pay yield prize to a ranked winner |
| `fundBooster()` | Owner | Fund additional booster prizes |
| `payBoosterPrize()` | Operator | Distribute booster prizes |
| `setOperator()` | Owner | Update the relayer operator address |
| `rescueToken()` | Owner | Recover accidentally sent tokens (not primary token) |

## Security Measures

- **ReentrancyGuard** — prevents reentrancy attacks on all fund-moving functions
- **SafeERC20** — uses OpenZeppelin's safe transfer library
- **Principal tracking** — maintains per-user principal balances to prevent over-refunding
- **Operator-only access** — only the designated relayer can trigger deposits and payouts
- **Primary token protection** — the `rescueToken()` function cannot withdraw the primary vault token

## Mirror Accounting

The OneChain Move contracts include mirror accounting logic that matches the Vault's state:
- `add_yield()` on the Round object mirrors yield accrued on the EVM Vault
- This ensures the Move contracts can calculate correct prize amounts
- Settlement on OneChain produces matching events for the relayer to execute on Base
