import PageNav from '../../components/PageNav'

export default function CreateTournament() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">How DexDuel Works</div>
        <h1>Create Tournament (Admin)</h1>
      </div>

      <div className="doc-content">
        <p>Platform administrators create and manage tournaments, ensuring quality control and a predictable schedule of supported assets and timeframes.</p>

        <h2>Admin Authorization</h2>
        <p>Admin privileges in DexDuel are determined through two mechanisms:</p>
        <ol>
          <li><strong>On-Chain Authority</strong>: The <span className="inline-code">ADMIN_CAP</span> object controls who can successfully call the Move admin functions. Only the wallet holding this capability can execute tournament operations.</li>
          <li><strong>Frontend Visibility</strong>: A client-side list in <span className="inline-code">constants.config.ts</span> determines which wallets can see the "Create Tournament" navigation link and access the <span className="inline-code">/arena</span> route.</li>
        </ol>

        <h2>Creation Flow</h2>
        <p>Creating a new tournament involves selecting parameters through the Admin Arena interface:</p>
        
        <table className="doc-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Trading Pair (Symbol)</strong></td>
              <td>The crypto asset players will predict on (e.g., BTC, ETH, SOL). Fetched dynamically from Finnhub API.</td>
            </tr>
            <tr>
              <td><strong>Entry Fee</strong></td>
              <td>The required USDT amount to join. Minimum is typically 10 USDT.</td>
            </tr>
            <tr>
              <td><strong>Start Time</strong></td>
              <td>When the tournament begins and the initial price is locked.</td>
            </tr>
            <tr>
              <td><strong>End Time</strong></td>
              <td>When predictions close and the final price is evaluated.</td>
            </tr>
            <tr>
              <td><strong>Min Participants</strong></td>
              <td>Threshold required for the tournament to proceed. If unmet, the tournament can be cancelled and refunded.</td>
            </tr>
          </tbody>
        </table>

        <h2>Smart Contract Execution</h2>
        <p>When an admin submits the creation form, the frontend builds a transaction block calling the <span className="inline-code">create_game_session</span> function in the <span className="inline-code">game_controller</span> Move module.</p>
        
        <p>This transaction creates three linked on-chain objects:</p>
        <ul>
          <li><strong>GameSession</strong>: The root object controlling the tournament lifecycle</li>
          <li><strong>Round</strong>: Tracks the entry pool, participants, and timings</li>
          <li><strong>PredictionRegistry</strong>: An empty registry ready to securely store player predictions</li>
        </ul>

        <h2>Tournament Status: UPCOMING</h2>
        <p>Once created, the tournament enters the <strong>UPCOMING</strong> state. During this time:</p>
        <ul>
          <li>The tournament appears on the public list</li>
          <li>Players can view the parameters but cannot join yet</li>
          <li>Admins can cancel the tournament if necessary</li>
        </ul>
        <p>The tournament remains in this state until the admin explicitly starts the round at the designated start time.</p>
      </div>

      <PageNav currentPath="/how-it-works/create-tournament" />
    </>
  )
}
