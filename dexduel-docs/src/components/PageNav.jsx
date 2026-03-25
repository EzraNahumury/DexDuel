import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { navSections } from './Sidebar'

export default function PageNav({ currentPath }) {
  const allItems = navSections.flatMap(section =>
    section.items.map(item => ({ ...item, section: section.title }))
  )

  const currentIndex = allItems.findIndex(item => item.path === currentPath)
  const prev = currentIndex > 0 ? allItems[currentIndex - 1] : null
  const next = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null

  if (!prev && !next) return null

  return (
    <div className="page-nav">
      {prev ? (
        <Link to={prev.path} className="page-nav-link prev">
          <span className="page-nav-label"><ChevronLeft size={14} style={{ verticalAlign: 'middle' }} /> Previous</span>
          <span className="page-nav-title">{prev.label}</span>
        </Link>
      ) : <div />}
      {next ? (
        <Link to={next.path} className="page-nav-link next">
          <span className="page-nav-label">Next <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /></span>
          <span className="page-nav-title">{next.label}</span>
        </Link>
      ) : <div />}
    </div>
  )
}
