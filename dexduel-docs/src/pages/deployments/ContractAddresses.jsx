import { AlertTriangle } from 'lucide-react'
import PageNav from '../../components/PageNav'

export default function ContractAddresses() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">Deployments</div>
        <h1>Contract Addresses</h1>
      </div>

      <div className="doc-content">
        <p>Deployed contract addresses for the current OneChain and Base environments.</p>

        <div className="callout callout-warning">
          <div className="callout-title"><AlertTriangle size={16} /> Testnet Only</div>
          <p>These addresses are on testnet environments with mock assets. They are for testing and validation only. Do not send real funds.</p>
        </div>

        <h2>OneChain Testnet Contracts (Sui VM Architecture)</h2>
        <p>The core game logic and state residency live within the OneChain Move package.</p>
        
        <table className="doc-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Object / Package ID</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Package ID</strong></td>
              <td><span className="inline-code">0x24a6e0952d708fc78efc21147a4d52899ff5c9ca8bf32e921d3e12051280dd94</span></td>
            </tr>
            <tr>
              <td><strong>Admin Cap</strong></td>
              <td><span className="inline-code">0xd6806fbc6de51ee50720be61d62c1dc4254cdfe924de71c2ba215fbdd16fc0c9</span></td>
            </tr>
            <tr>
              <td><strong>Faucet Config</strong></td>
              <td><span className="inline-code">0xffcdbc65727145be84eeccb8e217208d1c76f634b07fe9fce71b86c4786d38e0</span></td>
            </tr>
            <tr>
              <td><strong>Leaderboard State</strong></td>
              <td><span className="inline-code">0x7ad78de9bceb5cc8f5d0fecd9d675bde78dcb442b03fb55848bbff31ab58dc95</span></td>
            </tr>
            <tr>
              <td><strong>Mock OUSDT Type</strong></td>
              <td><span className="inline-code">&#123;PACKAGE_ID&#125;::ousdt::OUSDT</span></td>
            </tr>
          </tbody>
        </table>

        <h2>Base Sepolia Testnet Contracts (EVM Architecture)</h2>
        <p>The yield generation and cross-chain execution vault live on the EVM-compatible Base network.</p>

        <table className="doc-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Contract Address</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Vault Contract</strong></td>
              <td><span className="inline-code">0x1234567890abcdef1234567890abcdef12345678</span> <span className="text-secondary">(Placeholder for Base Sepolia Deployment)</span></td>
            </tr>
            <tr>
              <td><strong>Mock USDC (Yield Token)</strong></td>
              <td><span className="inline-code">0xabcdef1234567890abcdef1234567890abcdef12</span> <span className="text-secondary">(Placeholder for Base Sepolia Mock ERC20)</span></td>
            </tr>
            <tr>
              <td><strong>Relayer Operator</strong></td>
              <td><span className="inline-code">0x9999999999999999999999999999999999999999</span> <span className="text-secondary">(Placeholder for Authorized Relayer Address)</span></td>
            </tr>
          </tbody>
        </table>

        <h2>Network Details</h2>
        <h3>OneChain Testnet</h3>
        <ul>
          <li><strong>RPC URL</strong>: <span className="inline-code">https://rpc-testnet.onelabs.cc:443</span></li>
          <li><strong>Chain ID</strong>: <span className="inline-code">one-testnet</span></li>
          <li><strong>Explorer</strong>: <a href="https://explorer.onechain.io" target="_blank" rel="noopener noreferrer">https://explorer.onechain.io</a></li>
        </ul>

        <h3>Base Sepolia</h3>
        <ul>
          <li><strong>RPC URL</strong>: <span className="inline-code">https://sepolia.base.org</span></li>
          <li><strong>Chain ID</strong>: <span className="inline-code">84532</span></li>
          <li><strong>Explorer</strong>: <a href="https://sepolia.basescan.org" target="_blank" rel="noopener noreferrer">https://sepolia.basescan.org</a></li>
        </ul>
      </div>

      <PageNav currentPath="/deployments/contract-addresses" />
    </>
  )
}
