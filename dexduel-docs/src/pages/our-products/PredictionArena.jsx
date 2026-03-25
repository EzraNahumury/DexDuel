import { Lightbulb } from 'lucide-react'
import PageNav from '../../components/PageNav'

export default function PredictionArena() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">Our Products</div>
        <h1>Prediction Arena</h1>
      </div>

      <div className="doc-content">
        <p>
          The Prediction Arena is DexDuel's core product — a <strong>tournament-style price prediction game</strong> where players compete to forecast crypto price direction.
        </p>

        <h2>How It Works</h2>
        <p>
          Stake USDT, predict whether a crypto asset goes <strong>UP</strong> or <strong>DOWN</strong> within a time window. When the round ends, start and end prices are compared to determine the winning direction.
        </p>

        <h2>Tournament Structure</h2>
        <p>Each tournament is defined by:</p>
        <ul>
          <li><strong>Coin Symbol</strong> — the crypto asset being predicted (e.g., BTC, ETH, SOL)</li>
          <li><strong>Entry Fee</strong> — the USDT amount required to participate (e.g., 100 USDT)</li>
          <li><strong>Start Time</strong> — when the tournament opens for predictions</li>
          <li><strong>End Time</strong> — when the prediction window closes</li>
          <li><strong>Early Prediction Window</strong> — a bonus window at the start for decisive players</li>
          <li><strong>Minimum Participants</strong> — the minimum number of players required for the round to proceed</li>
        </ul>

        <h2>Round Lifecycle</h2>
        <div className="flow-diagram">{`UPCOMING → LIVE → ENDED → SETTLED → CLAIMABLE

  Create     Start      End       Settle     Claim
  Session    Round     Round      Round      Rewards
    ↓          ↓         ↓          ↓          ↓
  Config    Price    Compare    Lock pool   Players
  set up    locked   prices    + distribute receive
            (start)  (end)     to top 3    payouts`}</div>
        <ol>
          <li><strong>UPCOMING</strong> — Tournament is created and waiting for the start time</li>
          <li><strong>LIVE</strong> — Round is started with a locked start price; players can predict UP or DOWN</li>
          <li><strong>ENDED</strong> — Time window has closed; winner direction is determined</li>
          <li><strong>SETTLED</strong> — Admin fee is taken; prize pool is locked for top 3 distribution</li>
          <li><strong>CLAIMABLE</strong> — Winners claim their share; all participants can reclaim their principal</li>
        </ol>

        <h2>Reward Distribution</h2>
        <p>The yield pool (entry fees + generated yield) is distributed as follows:</p>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Share</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Platform</strong></td>
              <td>10%</td>
              <td>Admin fee for protocol sustainability</td>
            </tr>
            <tr>
              <td><strong>Rank #1</strong></td>
              <td>50%</td>
              <td>First place — largest share of net prize pool</td>
            </tr>
            <tr>
              <td><strong>Rank #2</strong></td>
              <td>30%</td>
              <td>Second place</td>
            </tr>
            <tr>
              <td><strong>Rank #3</strong></td>
              <td>20%</td>
              <td>Third place</td>
            </tr>
          </tbody>
        </table>
        <div className="callout callout-tip">
          <div className="callout-title"><Lightbulb size={16} /> Lossless Guarantee</div>
          <p>All other participants receive their original entry fee back in full — the lossless guarantee means you never lose your principal.</p>
        </div>

        <h2>Supported Assets</h2>
        <p>Any crypto asset available as a BINANCE/USDT pair through Finnhub. Common examples:</p>
        <ul>
          <li>BTC/USDT</li>
          <li>ETH/USDT</li>
          <li>SOL/USDT</li>
          <li>And any other BINANCE-listed USDT pair</li>
        </ul>
        <p>New assets can be added at tournament creation time — no contract upgrade needed.</p>
      </div>

      <PageNav currentPath="/our-products/prediction-arena" />
    </>
  )
}
