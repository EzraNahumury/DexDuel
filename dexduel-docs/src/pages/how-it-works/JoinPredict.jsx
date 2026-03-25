import PageNav from '../../components/PageNav'

export default function JoinPredict() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">How DexDuel Works</div>
        <h1>Join & Predict</h1>
      </div>

      <div className="doc-content">
        <p>The core gameplay: join an active tournament, commit your stake, and predict the price direction.</p>

        <h2>Starting the Round</h2>
        <p>Before players can join, the admin must transition the tournament from <strong>UPCOMING</strong> to <strong>LIVE</strong>. This is done by calling <span className="inline-code">start_game</span> on the smart contract.</p>
        
        <p>Crucially, this transaction records the <strong>Start Price</strong> on-chain. This price acts as the anchor point — all predictions will be evaluated against this exact price when the round ends.</p>

        <h2>Joining the Tournament</h2>
        <p>When a player clicks "Join," they execute a comprehensive transaction that handles staking, predicting, and cross-chain mirroring in one atomic step:</p>

        <ol>
          <li><strong>Stake Transfer</strong>: The player transfers the required Entry Fee (in USDT) from their wallet to the tournament's shared pool object.</li>
          <li><strong>Direction Selection</strong>: The player commits their prediction (UP or DOWN).</li>
          <li><strong>Prediction Record</strong>: A record is created in the <span className="inline-code">PredictionRegistry</span> tracking the player's address, direction, and timestamp.</li>
          <li><strong>Event Emission</strong>: The contract emits a <span className="inline-code">JoinEvent</span>, which the off-chain relayer detects to initiate the mirrored deposit on the Base EVM Vault.</li>
        </ol>

        <h2>The Prediction Experience</h2>
        <p>The frontend provides real-time data to help players make informed decisions:</p>
        <ul>
          <li><strong>Live Price Ticker</strong>: Up-to-the-second price data from Finnhub, showing the current price relative to the locked Start Price.</li>
          <li><strong>Candlestick Chart</strong>: Interactive TradingView-style charts showing historical price action.</li>
          <li><strong>Pool Statistics</strong>: Real-time visibility into how many players have predicted UP vs. DOWN, the total USDT pooled, and the estimated yield.</li>
        </ul>

        <h2>The Early Prediction Bonus</h2>
        <p>Players who submit within the first 25% of the tournament duration receive a <strong>+3 Point Early Bonus</strong> if their prediction is correct. This creates a trade-off: wait for more market data, or lock in early for bonus points.</p>

        <h2>State Lock</h2>
        <p>Once a player submits their prediction, their stake is locked in the contract pool until the round settles, and their prediction direction cannot be changed.</p>
      </div>

      <PageNav currentPath="/how-it-works/join-predict" />
    </>
  )
}
