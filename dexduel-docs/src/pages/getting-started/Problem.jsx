import PageNav from '../../components/PageNav'

export default function Problem() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-breadcrumb">Getting Started</div>
        <h1>Problem</h1>
      </div>

      <div className="doc-content">
        <h2>High-Risk Prediction Markets</h2>
        <p>
          Most prediction markets and GameFi platforms run on a <strong>zero-sum model</strong> — when one player wins, another loses their entire stake.
        </p>
        <ul>
          <li>New users stay away because they risk total loss</li>
          <li>Experienced players dominate, creating an uneven playing field</li>
          <li>Retention is low because losses feel punishing and irreversible</li>
        </ul>
        <p>
          The outcome: prediction markets remain niche, unable to grow beyond a small group of risk-tolerant traders.
        </p>

        <h2>Fragmented GameFi Experiences</h2>
        <p>
          Most GameFi prediction platforms confine everything — staking, prediction, yield, and settlement — to a single chain.
        </p>
        <ul>
          <li><strong>Limited yield</strong> — restricted to one chain's DeFi ecosystem</li>
          <li><strong>Capital inefficiency</strong> — staked assets sit idle during game rounds</li>
          <li><strong>Chain dependency</strong> — financial viability is tied to a single network</li>
        </ul>
        <p>
          No established model exists for separating game logic from yield generation across chains while keeping the experience seamless.
        </p>

        <h2>Lack of Principal Protection</h2>
        <p>In most prediction platforms, losing means losing everything you put in.</p>
        <ul>
          <li>Conservative users won't participate</li>
          <li>The gambling perception limits mainstream and institutional interest</li>
          <li>Multi-round participation requires risking significant capital</li>
          <li>Harsh penalties for wrong predictions discourage learning</li>
        </ul>

        <h2>No Persistent Competition</h2>
        <p>Most prediction platforms treat each round as an isolated event — no history, no progression.</p>
        <ul>
          <li>No reputation building for skilled predictors</li>
          <li>No long-term engagement beyond individual bets</li>
          <li>No reward for consistency or strategic play</li>
          <li>No social competition layer to drive organic growth</li>
        </ul>
        <p>
          Without reasons to return, churn stays high and communities never form.
        </p>
      </div>

      <PageNav currentPath="/getting-started/problem" />
    </>
  )
}
