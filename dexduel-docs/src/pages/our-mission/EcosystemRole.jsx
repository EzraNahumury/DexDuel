import PageNav from '../../components/PageNav'

export default function EcosystemRole() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">Our Mission</div>
        <h1>DexDuel's Role in Advancing the OneChain Ecosystem</h1>
      </div>

      <div className="doc-content">
        <h2>Real-World GameFi on OneChain</h2>
        <p>
          DexDuel is a flagship GameFi application on OneChain, proving that Sui VM-compatible chains can handle complex, real-time financial gaming.
          A fully functional prediction market with on-chain game state validates OneChain as a platform for serious decentralized applications.
        </p>

        <h2>Driving Adoption Through Accessible Gaming</h2>
        <p>The lossless model lowers the barrier to OneChain. Users who'd hesitate with complex DeFi protocols can start with a straightforward game:</p>
        <ul>
          <li><strong>Zero-risk participation</strong> attracts users who would avoid traditional prediction markets</li>
          <li><strong>Familiar mechanics</strong> (predicting price direction) require no specialized DeFi knowledge</li>
          <li><strong>Free USDT faucet</strong> enables immediate participation without token purchases on testnet</li>
        </ul>
        <p>Every DexDuel player becomes a OneChain user, growing the network organically through gameplay.</p>

        <h2>Showcasing Move Smart Contract Capabilities</h2>
        <p>DexDuel demonstrates advanced Move programming patterns on OneChain:</p>
        <ul>
          <li><strong>Shared objects</strong> — concurrent access to game sessions, rounds, and leaderboards by multiple players</li>
          <li><strong>Complex state machines</strong> — multi-step game lifecycle with strict transition guards</li>
          <li><strong>Cross-module composition</strong> — five interoperating modules (game controller, round, prediction, leaderboard, token)</li>
          <li><strong>Event-driven architecture</strong> — comprehensive event emission for UI updates and cross-chain synchronization</li>
        </ul>

        <h2>Establishing Cross-Chain Infrastructure</h2>
        <p>DexDuel builds cross-chain infrastructure between OneChain and EVM chains (Base), establishing patterns for:</p>
        <ul>
          <li><strong>Event-based bridge communication</strong> — relayer listens for OneChain events and executes EVM transactions</li>
          <li><strong>Mirror accounting</strong> — maintaining synchronized state across two different blockchain architectures</li>
          <li><strong>Multi-chain financial products</strong> — separating game logic from yield generation across chains</li>
        </ul>

        <h2>Foundation for a Broader GameFi Ecosystem</h2>
        <p>DexDuel establishes reusable infrastructure on OneChain:</p>
        <ul>
          <li>Smart contract patterns for tournament management</li>
          <li>Proven scoring and leaderboard infrastructure</li>
          <li>Cross-chain yield generation model</li>
          <li>A community of users already familiar with OneChain transactions</li>
        </ul>
      </div>

      <PageNav currentPath="/our-mission/ecosystem-role" />
    </>
  )
}
