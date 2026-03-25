import PageNav from '../../components/PageNav'

export default function Solution() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">Getting Started</div>
        <h1>Solution</h1>
      </div>

      <div className="doc-content">
        <h2>Lossless Tournament Model</h2>
        <p>
          DexDuel eliminates the zero-sum dynamic. Instead of redistributing losers' stakes to winners, it uses a <strong>yield-based reward model</strong>:
        </p>
        <ul>
          <li>All entry fees are pooled to generate yield</li>
          <li>Winners share the <strong>yield</strong> from the total pool</li>
          <li>Every participant gets <strong>100% of their original stake back</strong></li>
          <li>The platform takes a 10% fee on yield — not on player losses</li>
        </ul>
        <p>
          Worst case: you earn zero return. You never lose capital.
        </p>

        <h2>Cross-Chain Architecture with Separated Concerns</h2>
        <p>DexDuel separates game logic from yield generation across two chains, optimizing each layer:</p>
        <ul>
          <li><strong>OneChain (Sui VM)</strong> — handles all game state: tournaments, predictions, scoring, leaderboard, and settlement. Move smart contracts ensure safety and correctness</li>
          <li><strong>Base (EVM)</strong> — hosts the Vault contract where pooled stakes generate yield through DeFi protocols</li>
        </ul>
        <p>A relayer bridge synchronizes state between the two chains:</p>
        <ul>
          <li>When a player joins a round, a <span className="inline-code">JoinEvent</span> triggers mirrored deposit on the Base Vault</li>
          <li>When a round settles, <span className="inline-code">RefundEvent</span> and <span className="inline-code">PrizeEvent</span> trigger corresponding payouts</li>
          <li>Mirror accounting on OneChain ensures the Move contract can calculate correct prize values</li>
        </ul>

        <h2>Deterministic On-Chain Settlement</h2>
        <p>DexDuel's settlement process is fully deterministic and tamper-proof:</p>
        <ul>
          <li><strong>Winner direction</strong> is determined by comparing the start price and end price of the tracked asset</li>
          <li><strong>Top 3 rankings</strong> are locked on-chain before settlement — no post-hoc manipulation is possible</li>
          <li><strong>Prize pool is locked</strong> at settlement time — all reward calculations use the finalized pool value</li>
          <li><strong>Double-claim protection</strong> — each participant can claim exactly once</li>
        </ul>
        <p>The settlement flow enforces a strict state machine:</p>
        <div className="flow-diagram">{`Lock winner ranks → Lock winners → Settle round → Players claim`}</div>
        <p>Each step has on-chain guards preventing out-of-order execution or repeated calls.</p>

        <h2>Persistent Scoring and Season-Based Competition</h2>
        <p>DexDuel maintains a global leaderboard with a comprehensive scoring system:</p>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Points</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Correct Prediction</td>
              <td><strong>10</strong></td>
              <td>Base points for each winning prediction</td>
            </tr>
            <tr>
              <td>Win Streak (2+)</td>
              <td><strong>+5</strong></td>
              <td>Bonus for consecutive wins</td>
            </tr>
            <tr>
              <td>Early Prediction</td>
              <td><strong>+3</strong></td>
              <td>Bonus for predicting within the early window</td>
            </tr>
          </tbody>
        </table>
        <p>Rankings persist across rounds within a season. The top 100 players are tracked on-chain.</p>
      </div>

      <PageNav currentPath="/getting-started/solution" />
    </>
  )
}
