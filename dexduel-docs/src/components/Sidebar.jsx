import { NavLink, useLocation } from 'react-router-dom'
import { Swords } from 'lucide-react'

const navSections = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Overview', path: '/getting-started/overview' },
      { label: 'Problem', path: '/getting-started/problem' },
      { label: 'Solution', path: '/getting-started/solution' },
      { label: 'Features', path: '/getting-started/features' },
    ],
  },
  {
    title: 'Our Products',
    items: [
      { label: 'Prediction Arena', path: '/our-products/prediction-arena' },
      { label: 'Cross-Chain Vault', path: '/our-products/cross-chain-vault' },
    ],
  },
  {
    title: 'Our Mission',
    items: [
      { label: "DexDuel's Role in OneChain", path: '/our-mission/ecosystem-role' },
      { label: 'DexDuel Roadmap', path: '/our-mission/roadmap' },
    ],
  },
  {
    title: 'How DexDuel Works',
    items: [
      { label: 'Architecture', path: '/how-it-works/architecture' },
      { label: 'Create Tournament', path: '/how-it-works/create-tournament' },
      { label: 'Join & Predict', path: '/how-it-works/join-predict' },
      { label: 'Settlement & Rewards', path: '/how-it-works/settlement' },
      { label: 'Leaderboard & Scoring', path: '/how-it-works/leaderboard' },
    ],
  },
  {
    title: 'Deployments',
    items: [
      { label: 'Contract Addresses', path: '/deployments/contract-addresses' },
    ],
  },
  {
    title: 'Others',
    items: [
      { label: 'Links', path: '/others/links' },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <NavLink to="/getting-started/overview" className="sidebar-logo" onClick={onClose}>
          <div className="sidebar-logo-icon">
            <Swords size={18} />
          </div>
          <span className="sidebar-logo-text">DexDuel</span>
          <span className="sidebar-logo-badge">Docs</span>
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.title} className="nav-section">
            <div className="nav-section-title">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export { navSections }
