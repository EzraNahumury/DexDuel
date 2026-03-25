import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Overview from './pages/getting-started/Overview'
import Problem from './pages/getting-started/Problem'
import Solution from './pages/getting-started/Solution'
import Features from './pages/getting-started/Features'
import PredictionArena from './pages/our-products/PredictionArena'
import CrossChainVault from './pages/our-products/CrossChainVault'
import EcosystemRole from './pages/our-mission/EcosystemRole'
import Roadmap from './pages/our-mission/Roadmap'
import Architecture from './pages/how-it-works/Architecture'
import CreateTournament from './pages/how-it-works/CreateTournament'
import JoinPredict from './pages/how-it-works/JoinPredict'
import Settlement from './pages/how-it-works/Settlement'
import Leaderboard from './pages/how-it-works/Leaderboard'
import ContractAddresses from './pages/deployments/ContractAddresses'
import Links from './pages/others/Links'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/getting-started/overview" replace />} />
        <Route path="/getting-started/overview" element={<Overview />} />
        <Route path="/getting-started/problem" element={<Problem />} />
        <Route path="/getting-started/solution" element={<Solution />} />
        <Route path="/getting-started/features" element={<Features />} />
        <Route path="/our-products/prediction-arena" element={<PredictionArena />} />
        <Route path="/our-products/cross-chain-vault" element={<CrossChainVault />} />
        <Route path="/our-mission/ecosystem-role" element={<EcosystemRole />} />
        <Route path="/our-mission/roadmap" element={<Roadmap />} />
        <Route path="/how-it-works/architecture" element={<Architecture />} />
        <Route path="/how-it-works/create-tournament" element={<CreateTournament />} />
        <Route path="/how-it-works/join-predict" element={<JoinPredict />} />
        <Route path="/how-it-works/settlement" element={<Settlement />} />
        <Route path="/how-it-works/leaderboard" element={<Leaderboard />} />
        <Route path="/deployments/contract-addresses" element={<ContractAddresses />} />
        <Route path="/others/links" element={<Links />} />
      </Routes>
    </Layout>
  )
}

export default App
