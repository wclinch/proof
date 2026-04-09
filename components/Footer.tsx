'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const TAGLINES = [
  'HUMAN CURATED',
  'NOT GENERATED',
  'PEER REVIEWED',
  'NO ADVERTISING',
  'FREE TO USE',
  'VERIFIED BEFORE PUBLICATION',
  'MLA. APA. CHICAGO.',
  'SEARCH. SAVE. CITE.',
  'DEPTH OVER BREADTH',
  'NO SPONSORED RESULTS',
  'SOURCES WITH STANDARDS',
  'BUILT FOR RESEARCH',
  'ORGANIZED BY SUBJECT',
  'SUGGEST A SOURCE',
  'CREDIBILITY BY DESIGN',
  'RESEARCH-GRADE SOURCES',
  'SOURCED. VERIFIED. CITED.',
  'BIBLIOGRAPHY READY',
  'INDEXED BY SUBJECT',
  'COMMUNITY INFORMED',
]

export default function Footer() {
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
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Link
          href="/privacy"
          style={{ fontSize: '11px', color: '#2a2a2a', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#555')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
        >
          Privacy
        </Link>
        <a
          href="mailto:proof_dev@protonmail.com?subject=Proof — Contact"
          style={{ fontSize: '11px', color: '#2a2a2a', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#555')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
        >
          Contact
        </a>
        <Link
          href="/educators"
          style={{ fontSize: '11px', color: '#2a2a2a', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#555')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
        >
          Contribute
        </Link>
      </div>
    </footer>
  )
}
