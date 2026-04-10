'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TAGLINES = [
  'MLA. APA. CHICAGO.',
  'NO ADVERTISING',
  'FREE TO USE',
  'PASTE. CITE. DONE.',
  'DOI TO CITATION',
  'ZERO FRICTION',
  'INSTANT CITATIONS',
  'NO SIGN-UP REQUIRED',
  'RESEARCH-GRADE',
]

export default function Footer() {
  const pathname = usePathname()
  const [index, setIndex] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const t = setInterval(() => {
      setOpacity(0)
      fadeTimer.current = setTimeout(() => {
        setIndex(i => (i + 1) % TAGLINES.length)
        setOpacity(1)
      }, 300)
    }, 4000)
    return () => {
      clearInterval(t)
      if (fadeTimer.current) clearTimeout(fadeTimer.current)
    }
  }, [])

  return (
    <footer style={{
      padding: '24px 40px',
      borderTop: '1px solid #1a1a1a',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Proof —{' '}
        <span style={{ opacity, transition: 'opacity 0.3s ease' }}>
          {TAGLINES[index]}
        </span>
      </span>
      <div style={{ display: 'flex', gap: '24px' }}>
        <Link href="/privacy"
          style={{
            fontSize: '11px', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.15s',
            color: pathname === '/privacy' ? '#888' : '#2a2a2a',
            borderBottom: pathname === '/privacy' ? '1px solid #333' : '1px solid transparent',
            paddingBottom: '2px',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#555')}
          onMouseLeave={e => (e.currentTarget.style.color = pathname === '/privacy' ? '#888' : '#2a2a2a')}
        >
          Privacy
        </Link>
        <a href="mailto:proof_official@protonmail.com?subject=Proof — Contact"
          style={{ fontSize: '11px', color: '#2a2a2a', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#555')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
        >
          Contact
        </a>
      </div>
    </footer>
  )
}
