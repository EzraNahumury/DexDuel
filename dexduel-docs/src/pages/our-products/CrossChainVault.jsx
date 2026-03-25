import PageNav from '../../components/PageNav'

export default function CrossChainVault() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">Our Products</div>
        <h1>Cross-Chain Vault</h1>
      </div>

      <div className="doc-content">
        <p>
          The cross-chain EVM Vault enables <strong>real yield generation</strong> from pooled player stakes.
          Prizes come from actual DeFi returns on EVM chains — not from other players' losses.
        </p>

        <h2>Architecture</h2>
        <p>
          The Vault is a Solidity smart contract deployed on <strong>Base</strong> (EVM-compatible chain), designed to work in conjunction with the Move game contracts on OneChain through a relayer bridge.
        </p>
        <div className="flow-diagram">{`OneChain (Sui VM)          Relayer Bridge          Base (EVM)
┌──────────────────┐    ┌──────────────┐    ┌──────────────────┐
│  Game Contracts  │──→ │   Relayer    │──→ │    Vault.sol     │
│                  │    │  (off-chain) │    │                  │
│  JoinEvent       │──→ │  Listens for │──→ │  depositFor()    │
│  RefundEvent     │──→ │  on-chain    │──→ │  refund()        │
│  PrizeEvent      │──→ │  events      │──→ │  payPrize()      │
└──────────────────┘    └──────────────┘    └──────────────────┘`}</div>

        <h2>How It Works</h2>

        <h3>Deposit Mirroring</h3>
        <p>
          When a player joins a round on OneChain, the game contract emits a <span className="inline-code">JoinEvent</span>.
          The relayer detects this event and calls <span className="inline-code">depositFor()</span> on the Base Vault, mirroring the deposit on the EVM side.
        </p>

        <h3>Yield Generation</h3>
        <p>While funds are held in the Vault during the tournament window, they can be deployed into yield-generating DeFi protocols. The Vault architecture includes hooks for Aave V3 integration:</p>
        <ul>
          <li>Deposited tokens are supplied to Aave's lending pool</li>
          <li>Interest accrues during the tournament window</li>
          <li>Yield is withdrawn when the round settles</li>
        </ul>

        <h3>Settlement Distribution</h3>
        <p>After a round ends:</p>
        <ul>
          <li><strong>Refund</strong>: All participants receive their principal back via <span className="inline-code">refund()</span> calls</li>
          <li><strong>Prize</strong>: Top 3 winners receive their prize share via <span className="inline-code">payPrize()</span> calls</li>
          <li><strong>Booster</strong>: Additional incentive prizes can be distributed via <span className="inline-code">payBoosterPrize()</span></li>
        </ul>

        <h2>Vault Contract Functions</h2>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Function</th>
              <th>Access</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="inline-code">depositFor()</span></td>
              <td>Operator</td>
              <td>Mirror-deposit for a OneChain user</td>
            </tr>
            <tr>
              <td><span className="inline-code">refund()</span></td>
              <td>Operator</td>
              <td>Return principal to a Base recipient</td>
            </tr>
            <tr>
              <td><span className="inline-code">payPrize()</span></td>
              <td>Operator</td>
              <td>Pay yield prize to a ranked winner</td>
            </tr>
            <tr>
              <td><span className="inline-code">fundBooster()</span></td>
              <td>Owner</td>
              <td>Fund additional booster prizes</td>
            </tr>
            <tr>
              <td><span className="inline-code">payBoosterPrize()</span></td>
              <td>Operator</td>
              <td>Distribute booster prizes</td>
            </tr>
            <tr>
              <td><span className="inline-code">setOperator()</span></td>
              <td>Owner</td>
              <td>Update the relayer operator address</td>
            </tr>
            <tr>
              <td><span className="inline-code">rescueToken()</span></td>
              <td>Owner</td>
              <td>Recover accidentally sent tokens (not primary token)</td>
            </tr>
          </tbody>
        </table>

        <h2>Security Measures</h2>
        <ul>
          <li><strong>ReentrancyGuard</strong> — prevents reentrancy attacks on all fund-moving functions</li>
          <li><strong>SafeERC20</strong> — uses OpenZeppelin's safe transfer library</li>
          <li><strong>Principal tracking</strong> — maintains per-user principal balances to prevent over-refunding</li>
          <li><strong>Operator-only access</strong> — only the designated relayer can trigger deposits and payouts</li>
          <li><strong>Primary token protection</strong> — the <span className="inline-code">rescueToken()</span> function cannot withdraw the primary vault token</li>
        </ul>

        <h2>Mirror Accounting</h2>
        <p>The OneChain Move contracts include mirror accounting logic that matches the Vault's state:</p>
        <ul>
          <li><span className="inline-code">add_yield()</span> on the Round object mirrors yield accrued on the EVM Vault</li>
          <li>This ensures the Move contracts can calculate correct prize amounts</li>
          <li>Settlement on OneChain produces matching events for the relayer to execute on Base</li>
        </ul>
      </div>

      <PageNav currentPath="/our-products/cross-chain-vault" />
    </>
  )
}
