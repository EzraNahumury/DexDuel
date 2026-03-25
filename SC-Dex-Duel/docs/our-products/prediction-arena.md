# Prediction Arena

DexDuel's Prediction Arena is the core product — a tournament-style price prediction game where players compete to forecast the direction of crypto asset prices.

## How It Works

Players enter prediction tournaments by staking USDT and choosing whether they believe a specific crypto asset's price will go **UP** or **DOWN** during a defined time window. At the end of the round, the start price and end price are compared to determine the winning direction.

## Tournament Structure

Each tournament is defined by:

- **Coin Symbol** — the crypto asset being predicted (e.g., BTC, ETH, SOL)
- **Entry Fee** — the USDT amount required to participate (e.g., 100 USDT)
- **Start Time** — when the tournament opens for predictions
- **End Time** — when the prediction window closes
- **Early Prediction Window** — a bonus window at the start for decisive players
- **Minimum Participants** — the minimum number of players required for the round to proceed

## Round Lifecycle

```
UPCOMING → LIVE → ENDED → SETTLED → CLAIMABLE

  Create     Start      End       Settle     Claim
  Session    Round     Round      Round      Rewards
    ↓          ↓         ↓          ↓          ↓
  Config    Price    Compare    Lock pool   Players
  set up    locked   prices    + distribute receive
            (start)  (end)     to top 3    payouts
```

1. **UPCOMING** — Tournament is created and waiting for the start time
2. **LIVE** — Round is started with a locked start price; players can predict UP or DOWN
3. **ENDED** — Time window has closed; winner direction is determined
4. **SETTLED** — Admin fee is taken; prize pool is locked for top 3 distribution
5. **CLAIMABLE** — Winners claim their share; all participants can reclaim their principal

## Reward Distribution

The yield pool (entry fees + generated yield) is distributed as follows:

| Recipient | Share | Description |
|-----------|-------|-------------|
| **Platform** | 10% | Admin fee for protocol sustainability |
| **Rank #1** | 50% | First place — largest share of net prize pool |
| **Rank #2** | 30% | Second place |
| **Rank #3** | 20% | Third place |

All other participants receive their original entry fee back in full — the lossless guarantee.

## Supported Assets

DexDuel supports any crypto asset available on the BINANCE/USDT trading pair through Finnhub market data integration. Common examples include:

- BTC/USDT
- ETH/USDT
- SOL/USDT
- And any other BINANCE-listed USDT pair

New assets can be added at tournament creation time without requiring contract upgrades.
