import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState([])
  const [activeId, setActiveId] = useState('')
  const observerRef = useRef(null)
  const location = useLocation()

  // Scan headings whenever the route changes
  useEffect(() => {
    // Small delay to let the page render
    const timer = setTimeout(() => {
      const docContent = document.querySelector('.doc-content')
      if (!docContent) return

      const elements = docContent.querySelectorAll('h2, h3')
      const items = []

      elements.forEach((el) => {
        const id = el.id || slugify(el.textContent)
        el.id = id
        items.push({
          id,
          text: el.textContent,
          level: el.tagName === 'H3' ? 3 : 2,
        })
      })

      setHeadings(items)
      setActiveId(items.length > 0 ? items[0].id : '')
    }, 50)

    return () => clearTimeout(timer)
  }, [location.pathname])

  // IntersectionObserver for scroll spy
  useEffect(() => {
    if (headings.length === 0) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    const callback = (entries) => {
      // Find the topmost visible heading
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

      if (visible.length > 0) {
        setActiveId(visible[0].target.id)
      }
    }

    observerRef.current = new IntersectionObserver(callback, {
      rootMargin: '-64px 0px -70% 0px',
      threshold: 0,
    })

    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observerRef.current.observe(el)
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav className="toc" aria-label="Table of contents">
      <div className="toc-title">On this page</div>
      <ul className="toc-list">
        {headings.map(({ id, text, level }) => (
          <li key={id} className={`toc-item ${level === 3 ? 'toc-item-nested' : ''}`}>
            <a
              href={`#${id}`}
              className={`toc-link ${activeId === id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(id)
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  setActiveId(id)
                }
              }}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
