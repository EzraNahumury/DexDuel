import PageNav from '../../components/PageNav'

export default function Architecture() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">How DexDuel Works</div>
        <h1>Architecture</h1>
      </div>

      <div className="doc-content">
        <p>DexDuel is built as a multi-layer, cross-chain system with clear separation of concerns between game logic, yield generation, and user interface.</p>

        <h2>System Overview</h2>
        <div className="flow-diagram">{`┌─────────────────────────────────────────────────────────────┐
│                  Browser (Next.js Frontend)                  │
│                                                              │
│  ┌──────────┐  ┌─────────────┐  ┌────────────┐  ┌────────┐ │
│  │ Landing  │  │ Tournaments │  │ Tournament │  │ Arena  │ │
│  │  Page    │  │    Hub      │  │   Detail   │  │ Admin  │ │
│  └──────────┘  └─────────────┘  └────────────┘  └────────┘ │
│  ┌──────────┐  ┌─────────────┐                              │
│  │Leaderboard│  │  My Arena  │                              │
│  └──────────┘  └─────────────┘                              │
├──────────────────────────┬──────────────────────────────────┤
│   Finnhub API Proxy     │     OneChain RPC (Sui VM)        │
│   /api/market/*          │     Transaction Signing          │
└──────────────────────────┴──────────────────────────────────┘
            │                           │
            ▼                           ▼
   ┌─────────────────┐      ┌──────────────────────┐
   │  Finnhub API    │      │   OneChain Testnet   │
   │  Market Data    │      │                      │
   │  • Quotes       │      │  Move Smart Contracts│
   │  • Candles      │      │  ┌────────────────┐  │
   │  • Symbols      │      │  │game_controller │  │
   └─────────────────┘      │  │game_round      │  │
                             │  │prediction      │  │
                             │  │leaderboard     │  │
                             │  │usdt            │  │
                             │  └────────────────┘  │
                             └─────────┬────────────┘
                                       │
                              ┌────────┴────────┐
                              │  Relayer Bridge │
                              │  (Off-chain)    │
                              └────────┬────────┘
                                       │
                             ┌─────────┴──────────┐
                             │   Base (EVM)       │
                             │   Vault.sol        │
                             │   • depositFor()   │
                             │   • refund()       │
                             │   • payPrize()     │
                             │   • Aave V3 hooks  │
                             └────────────────────┘`}</div>

        <h2>Smart Contract Layer (OneChain)</h2>
        <p>DexDuel's game logic lives in five Move modules deployed as a single package on OneChain:</p>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="inline-code">game_controller</span></td>
              <td>Orchestrates the full game flow — create sessions, join game, complete game, claim rewards. Emits relayer events for cross-chain coordination.</td>
            </tr>
            <tr>
              <td><span className="inline-code">game_round</span></td>
              <td>Manages individual rounds — timing, pricing, pool balances, status transitions, settlement, and reward claims.</td>
            </tr>
            <tr>
              <td><span className="inline-code">prediction</span></td>
              <td>Tracks player predictions — direction, timing, correctness, ranking. Manages the PredictionRegistry shared object.</td>
            </tr>
            <tr>
              <td><span className="inline-code">leaderboard</span></td>
              <td>Maintains player statistics — scores, streaks, win rates. Ranks top 100 players per season.</td>
            </tr>
            <tr>
              <td><span className="inline-code">usdt</span></td>
              <td>Defines the mock USDT token (6 decimals) with a public faucet for testnet usage.</td>
            </tr>
          </tbody>
        </table>

        <h2>EVM Vault Layer (Base)</h2>
        <p>The Solidity Vault contract on Base handles yield generation:</p>
        <ul>
          <li>Receives mirrored deposits via the relayer</li>
          <li>Deploys funds to Aave V3 for interest accrual (planned)</li>
          <li>Processes refunds and prize payouts on settlement</li>
          <li>Maintains per-user principal tracking for safety</li>
        </ul>

        <h2>Frontend Layer (Next.js)</h2>
        <p>The web application provides the user interface with:</p>
        <ul>
          <li><strong>Wallet integration</strong> — OneWallet connection via <span className="inline-code">@onelabs/dapp-kit</span></li>
          <li><strong>Live market data</strong> — Finnhub API proxied through Next.js API routes</li>
          <li><strong>On-chain reads</strong> — React Query hooks polling OneChain RPC for tournament data</li>
          <li><strong>Transaction signing</strong> — pre-built BCS transactions signed via wallet adapter</li>
        </ul>

        <h2>Cross-Chain Communication</h2>
        <p>State synchronization between OneChain and Base happens through an event-driven relayer:</p>
        <ol>
          <li>Move contracts emit <span className="inline-code">JoinEvent</span>, <span className="inline-code">RefundEvent</span>, <span className="inline-code">PrizeEvent</span></li>
          <li>Off-chain relayer monitors OneChain events in real-time</li>
          <li>Relayer calls corresponding Vault functions on Base</li>
          <li>Mirror accounting on OneChain (<span className="inline-code">add_yield()</span>) keeps state synchronized</li>
        </ol>
      </div>

      <PageNav currentPath="/how-it-works/architecture" />
    </>
  )
}
