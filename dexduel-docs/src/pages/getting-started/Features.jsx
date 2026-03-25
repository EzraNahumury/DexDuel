import PageNav from '../../components/PageNav'

export default function Features() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">Getting Started</div>
        <h1>Features</h1>
      </div>

      <div className="doc-content">
        <h2>Lossless Prediction Tournaments</h2>
        <p>DexDuel enables users to participate in crypto price prediction tournaments with zero risk to their principal.</p>
        <p>The tournament flow operates as a single coordinated position:</p>
        <ul>
          <li>Entry fees are pooled and used to generate yield</li>
          <li>Players predict UP or DOWN on a specific crypto asset</li>
          <li>Yield is distributed to top performers</li>
          <li>All participants receive their full stake back after settlement</li>
        </ul>

        <h2>On-Chain Game Engine on OneChain</h2>
        <p>All game logic is executed and stored on OneChain through Move smart contracts.</p>
        <p>DexDuel's on-chain engine manages:</p>
        <ul>
          <li>Tournament creation and configuration</li>
          <li>Round lifecycle (create → start → predict → end → settle → claim)</li>
          <li>Player predictions and direction tracking</li>
          <li>Pool accounting and reward computation</li>
          <li>Leaderboard scoring and ranking</li>
        </ul>

        <h2>Cross-Chain EVM Vault for Yield Generation</h2>
        <p>DexDuel integrates a Solidity-based Vault contract deployed on Base to generate yield from pooled stakes.</p>
        <p>The cross-chain bridge enables:</p>
        <ul>
          <li>Mirrored deposits when players join rounds on OneChain</li>
          <li>Refund distribution after round settlement</li>
          <li>Prize payouts to ranked winners</li>
          <li>Booster funding for additional prize incentives</li>
        </ul>

        <h2>Move Smart Contracts with Resource Safety</h2>
        <p>DexDuel's core contracts are written in Move, leveraging the language's resource-oriented design.</p>
        <p>This enables:</p>
        <ul>
          <li><strong>Safe asset handling</strong> — tokens cannot be duplicated or lost through programming errors</li>
          <li><strong>Modular contract design</strong> — separate modules for game control, rounds, predictions, leaderboard, and tokens</li>
          <li><strong>Type-safe shared objects</strong> — concurrent access patterns for multi-player tournaments</li>
          <li><strong>Comprehensive event system</strong> — all game actions emit events for UI updates and cross-chain synchronization</li>
        </ul>

        <h2>Real-Time Market Data Integration</h2>
        <p>DexDuel connects to live market data to power the prediction experience:</p>
        <ul>
          <li><strong>Live price feeds</strong> from Finnhub API for supported BINANCE trading pairs</li>
          <li><strong>Candlestick charts</strong> with configurable resolution for informed predictions</li>
          <li><strong>Price anchoring</strong> — round start and end prices are captured from real market data</li>
          <li><strong>Dynamic symbol support</strong> — new trading pairs can be added without contract redeployment</li>
        </ul>

        <h2>Comprehensive Leaderboard and Scoring</h2>
        <p>DexDuel tracks player performance across rounds with a multi-dimensional scoring system:</p>
        <ul>
          <li><strong>Win points</strong> (10 per correct prediction) — rewards accuracy</li>
          <li><strong>Streak bonuses</strong> (5 per consecutive win) — rewards consistency</li>
          <li><strong>Early prediction bonus</strong> (3 for predictions within the early window) — rewards decisiveness</li>
          <li><strong>Season rankings</strong> — groups rounds into competitive seasons</li>
          <li><strong>Global top 100</strong> — maintained on-chain for transparency</li>
        </ul>

        <h2>Tournament Cancellation and Refund System</h2>
        <p>DexDuel includes safety mechanisms for tournament management:</p>
        <ul>
          <li>Tournaments can be cancelled if minimum participation thresholds are not met</li>
          <li>Upcoming tournaments can be cancelled before start time</li>
          <li>All participants receive full refunds when a tournament is cancelled</li>
          <li>Refund claims are tracked per-address to prevent double claims</li>
        </ul>
      </div>

      <PageNav currentPath="/getting-started/features" />
    </>
  )
}
