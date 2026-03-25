import PageNav from '../../components/PageNav'

export default function Roadmap() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">Our Mission</div>
        <h1>DexDuel Roadmap</h1>
      </div>

      <div className="doc-content">
        <h2>Q1 2026 — Testnet Launch</h2>
        <p>DexDuel launches on OneChain Testnet with the complete prediction tournament experience. Users can:</p>
        <ul>
          <li>Claim free testnet USDT via the on-chain faucet</li>
          <li>Join prediction tournaments on live crypto assets (BTC, ETH, SOL, and more)</li>
          <li>Compete on the global leaderboard</li>
          <li>Experience the lossless prediction model firsthand</li>
        </ul>
        <p>Focus: validating game mechanics, smart contract security, and cross-chain vault integration with Base.</p>

        <h2>Q2 2026 — Security Audits and Optimization</h2>
        <p>Comprehensive security reviews and performance optimization:</p>
        <ul>
          <li>Move smart contract audit by independent security firms</li>
          <li>EVM Vault contract audit (Solidity)</li>
          <li>Cross-chain relayer reliability testing</li>
          <li>Gas optimization for both OneChain and Base transactions</li>
          <li>Stress testing with high concurrent player counts</li>
        </ul>

        <h2>Q3 2026 — Mainnet Deployment</h2>
        <p>After successful audits, DexDuel deploys on OneChain Mainnet. Production-ready lossless prediction gaming:</p>
        <ul>
          <li>Real USDT is staked and returned</li>
          <li>Yield is generated through Aave V3 integration on Base</li>
          <li>Prizes are funded from actual DeFi returns</li>
          <li>The global leaderboard tracks rankings with real stakes</li>
        </ul>

        <h2>Q4 2026 — Expansion</h2>
        <p>Platform expansion with new features and broader asset coverage:</p>
        <ul>
          <li><strong>Additional prediction assets</strong> — stocks, forex, commodities through expanded oracle integration</li>
          <li><strong>Multi-season competitions</strong> — season-based rankings with end-of-season rewards</li>
          <li><strong>Social features</strong> — player profiles, prediction sharing, and community challenges</li>
          <li><strong>Mobile optimization</strong> — enhanced mobile experience for on-the-go predictions</li>
          <li><strong>Advanced yield strategies</strong> — diversified DeFi yield sources beyond Aave V3</li>
          <li><strong>Tournament types</strong> — new game modes (longer durations, higher stakes, team-based)</li>
        </ul>
      </div>

      <PageNav currentPath="/our-mission/roadmap" />
    </>
  )
}
