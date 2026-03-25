import { Info } from 'lucide-react'
import PageNav from '../../components/PageNav'

export default function Links() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">Others</div>
        <h1>Important Links</h1>
      </div>

      <div className="doc-content">
        <p>Core platforms and resources for the DexDuel ecosystem.</p>

        <h2>Platform Access</h2>
        <div className="callout callout-info">
          <div className="callout-title"><Info size={16} /> Development Notice</div>
          <p>DexDuel is in active development on OneChain testnet. Links below point to testing and staging environments.</p>
        </div>

        <ul>
          <li>
            <strong>DexDuel Application</strong><br />
            The main landing page and tournament arena. Connect your wallet, claim testnet OUSDT, and start predicting.<br />
            <a href="https://dex-duel.vercel.app" target="_blank" rel="noopener noreferrer">DexDuel App</a>
          </li>
          <li>
            <strong>OneChain Testnet Explorer</strong><br />
            Explore blocks, view transactions, and inspect the DexDuel Move contracts deployed natively on OneChain.<br />
            <a href="https://explorer.onechain.io" target="_blank" rel="noopener noreferrer">https://explorer.onechain.io</a>
          </li>
          <li>
            <strong>Base Sepolia Explorer</strong><br />
            Monitor the cross-chain relayer vault and yield-generating transactions on the Base testnet.<br />
            <a href="https://sepolia.basescan.org" target="_blank" rel="noopener noreferrer">https://sepolia.basescan.org</a>
          </li>
        </ul>

        <h2>Developer & Community Resources</h2>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Description</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Onelabs DApp Kit</strong></td>
              <td>Official documentation for integrating the OneChain wallet adapter and React providers into web applications.</td>
              <td><a href="#" target="_blank" rel="noopener noreferrer">Placeholder Link</a></td>
            </tr>
            <tr>
              <td><strong>Finnhub API</strong></td>
              <td>Real-time market quotes and candlestick charts powering DexDuel's pricing engine.</td>
              <td><a href="https://finnhub.io/docs/api" target="_blank" rel="noopener noreferrer">Finnhub Docs</a></td>
            </tr>
            <tr>
              <td><strong>Foundry Book</strong></td>
              <td>Documentation for building and testing the Solidity EVM Vault deployed on Base.</td>
              <td><a href="https://book.getfoundry.sh/" target="_blank" rel="noopener noreferrer">Foundry Docs</a></td>
            </tr>
          </tbody>
        </table>

        <h2>Source Code Reference</h2>
        <p>The project is structured into distinct repositories handling specific architectural layers:</p>
        <ul>
          <li><span className="inline-code">SC-Dex-Duel/</span>: Move smart contracts for tournament logic on OneChain.</li>
          <li><span className="inline-code">Fe_Dex_Duel/</span>: Current Next.js frontend implementation mapping the app router and blockchain hooks.</li>
          <li><span className="inline-code">onechain-evm-vault/</span>: Foundry project managing the Solidity Vault on Base.</li>
          <li><span className="inline-code">dexduel-docs/</span>: This documentation site (Vite/React).</li>
        </ul>
      </div>

      <PageNav currentPath="/others/links" />
    </>
  )
}
