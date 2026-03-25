# Features

## Lossless Prediction Tournaments

DexDuel enables users to participate in crypto price prediction tournaments with zero risk to their principal.

The tournament flow operates as a single coordinated position:
- Entry fees are pooled and used to generate yield
- Players predict UP or DOWN on a specific crypto asset
- Yield is distributed to top performers
- All participants receive their full stake back after settlement

This removes the need to risk capital while maintaining a competitive and financially rewarding experience.

## On-Chain Game Engine on OneChain

All game logic is executed and stored on OneChain through Move smart contracts.

DexDuel's on-chain engine manages:
- Tournament creation and configuration
- Round lifecycle (create → start → predict → end → settle → claim)
- Player predictions and direction tracking
- Pool accounting and reward computation
- Leaderboard scoring and ranking

The game state is fully transparent and verifiable — every prediction, score update, and reward claim is a traceable on-chain transaction.

## Cross-Chain EVM Vault for Yield Generation

DexDuel integrates a Solidity-based Vault contract deployed on Base to generate yield from pooled stakes.

The cross-chain bridge enables:
- Mirrored deposits when players join rounds on OneChain
- Refund distribution after round settlement
- Prize payouts to ranked winners
- Booster funding for additional prize incentives

This architecture allows DexDuel to tap into the mature DeFi ecosystem on EVM chains while keeping game logic on the high-performance OneChain network.

## Move Smart Contracts with Resource Safety

DexDuel's core contracts are written in Move, leveraging the language's resource-oriented design.

This enables:
- **Safe asset handling** — tokens cannot be duplicated or lost through programming errors
- **Modular contract design** — separate modules for game control, rounds, predictions, leaderboard, and tokens
- **Type-safe shared objects** — concurrent access patterns for multi-player tournaments
- **Comprehensive event system** — all game actions emit events for UI updates and cross-chain synchronization

Move provides the correctness guarantees required for a financial gaming application where security and fairness are paramount.

## Real-Time Market Data Integration

DexDuel connects to live market data to power the prediction experience:
- **Live price feeds** from Finnhub API for supported BINANCE trading pairs
- **Candlestick charts** with configurable resolution for informed predictions
- **Price anchoring** — round start and end prices are captured from real market data
- **Dynamic symbol support** — new trading pairs can be added without contract redeployment

## Comprehensive Leaderboard and Scoring

DexDuel tracks player performance across rounds with a multi-dimensional scoring system:

- **Win points** (10 per correct prediction) — rewards accuracy
- **Streak bonuses** (5 per consecutive win) — rewards consistency
- **Early prediction bonus** (3 for predictions within the early window) — rewards decisiveness
- **Season rankings** — groups rounds into competitive seasons
- **Global top 100** — maintained on-chain for transparency

The leaderboard creates a persistent competitive layer that drives engagement beyond individual rounds.

## Tournament Cancellation and Refund System

DexDuel includes safety mechanisms for tournament management:
- Tournaments can be cancelled if minimum participation thresholds are not met
- Upcoming tournaments can be cancelled before start time
- All participants receive full refunds when a tournament is cancelled
- Refund claims are tracked per-address to prevent double claims
