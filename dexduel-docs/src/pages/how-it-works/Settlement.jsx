import PageNav from '../../components/PageNav'

export default function Settlement() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">How DexDuel Works</div>
        <h1>Settlement & Rewards</h1>
      </div>

      <div className="doc-content">
        <p>When the tournament window closes, the round enters settlement — a deterministic process that resolves outcomes and distributes rewards under the lossless model.</p>

        <h2>1. Ending the Round</h2>
        <p>An admin triggers the end of the round by submitting the final closing price from the oracle data.</p>
        <div className="flow-diagram">{`Start Price  vs  End Price  →  Winner Direction
$64,500          $65,100    →        UP
$64,500          $64,200    →       DOWN`}</div>
        
        <p>The contract compares the End Price against the previously locked Start Price. This sets the <span className="inline-code">winner_direction</span> in the Round state. At this point, no further predictions are accepted.</p>

        <h2>2. Determining the Winners</h2>
        <p>The contract executes a ranking algorithm to identify the top performers among those who predicted correctly. The primary ranking criteria are:</p>
        <ol>
          <li><strong>Correct Prediction</strong>: Only players who matched the <span className="inline-code">winner_direction</span> are eligible.</li>
          <li><strong>Timestamp</strong>: Ties are broken by the earliest prediction submission time.</li>
        </ol>
        
        <p>The <span className="inline-code">lock_winner_ranks</span> function executes this logic and finalizes the top three addresses. This prevents any ambiguity or manipulation in determining who receives the yield prizes.</p>

        <h2>3. Reward Calculation</h2>
        <p>Before settlement, the <span className="inline-code">add_yield</span> function may be called to mirror the yield generated on the Base EVM Vault back to the OneChain contract's accounting system.</p>
        
        <p>The total yield is then split into predefined tranches:</p>
        <ul>
          <li><strong>Admin Fee (10%)</strong>: Deducted from the yield for platform sustainability.</li>
          <li><strong>Rank #1 (50%)</strong>: Half of the remaining yield goes to the top estimator.</li>
          <li><strong>Rank #2 (30%)</strong>: The second-place estimator's share.</li>
          <li><strong>Rank #3 (20%)</strong>: The third-place estimator's share.</li>
        </ul>

        <h2>4. The Claiming Process</h2>
        <p>Finally, the round transitions to the <strong>SETTLED</strong> state. This unlocks the ability for users to claim their funds.</p>

        <h3>The Lossless Return</h3>
        <p>Every participant — win or lose — calls the claim function to get their original entry fee back in full. The contract enforces strict ledger accounting to prevent double claims.</p>

        <h3>Prize Distribution</h3>
        <p>When the top 3 players execute their claim, they receive their original stake <em>plus</em> their calculated yield share.</p>
        
        <p>This settlement process emits <span className="inline-code">RefundEvent</span> and <span className="inline-code">PrizeEvent</span> signals, which the relayer bridge picks up to tell the Base EVM Vault to release the corresponding real assets back to the users' EVM wallets.</p>
      </div>

      <PageNav currentPath="/how-it-works/settlement" />
    </>
  )
}
