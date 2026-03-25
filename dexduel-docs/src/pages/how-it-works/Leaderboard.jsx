import PageNav from '../../components/PageNav'

export default function Leaderboard() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">How DexDuel Works</div>
        <h1>Leaderboard & Scoring</h1>
      </div>

      <div className="doc-content">
        <p>Beyond per-tournament yield rewards, the global Leaderboard tracks long-term progression — rewarding consistency and establishing the reputation of top predictors.</p>

        <h2>The Scoring System</h2>
        <p>After each tournament settles, the <span className="inline-code">leaderboard</span> contract evaluates all participants and updates their persistent scores.</p>

        <table className="doc-table">
          <thead>
            <tr>
              <th>Achievement</th>
              <th>Points Awarded</th>
              <th>Trigger Condition</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Victory Base</strong></td>
              <td>+10 Points</td>
              <td>Successfully predicting the correct price direction (UP/DOWN).</td>
            </tr>
            <tr>
              <td><strong>Streak Bonus</strong></td>
              <td>+5 Points</td>
              <td>Winning two or more consecutive tournaments without a loss between them.</td>
            </tr>
            <tr>
              <td><strong>Early Bird</strong></td>
              <td>+3 Points</td>
              <td>Submitting the prediction during the designated "early window" at the start of a round, <em>and</em> predicting correctly.</td>
            </tr>
            <tr>
              <td><strong>Defeat / Refund</strong></td>
              <td>0 Points</td>
              <td>Predicting incorrectly. Player retains their current score without penalty, but loses any active win streak multiplier.</td>
            </tr>
          </tbody>
        </table>

        <h2>Seasons and On-Chain Persistence</h2>
        <p>The leaderboard runs on a Season structure, so new players can compete without facing insurmountable point deficits from early adopters.</p>
        <ul>
          <li><strong>Persistent Object</strong>: The <span className="inline-code">Leaderboard</span> object is a shared asset on OneChain.</li>
          <li><strong>Top 100 Guarantee</strong>: To optimize on-chain storage while providing a meaningful competitive ladder, the contract maintains a strict, sorted list of the top 100 performing addresses.</li>
          <li><strong>Event Emissions</strong>: Every score change emits a <span className="inline-code">ScoreUpdated</span> event. The frontend indexes these events to build rich player profiles including total wins, losses, win rate percentage, and highest achieved streaks.</li>
        </ul>

        <h2>My Arena (Player Profile)</h2>
        <p>The player dashboard aggregates on-chain data into a single view:</p>
        <ul>
          <li><strong>Wallet Assets</strong>: Readouts of available USDT balances for staking.</li>
          <li><strong>Global Rank</strong>: The user's current standing among all players.</li>
          <li><strong>Historical Record</strong>: A complete ledger of past tournaments they participated in, the predictions they made, and the financial outcomes (stakes returned, yield earned).</li>
          <li><strong>Analytics</strong>: Visual representations of their win/loss ratio and total points accumulated.</li>
        </ul>
      </div>

      <PageNav currentPath="/how-it-works/leaderboard" />
    </>
  )
}
