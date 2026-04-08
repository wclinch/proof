'use client'

import { useState, useEffect } from 'react'

const TAGLINES = [
  'VETTED ACADEMIC SOURCES',
  'NO ADS. NO SLOP.',
  'HAND CURATED',
  'BUILT FOR STUDENTS',
  'HUMAN REVIEWED',
  'NOT GENERATED',
  'REAL SOURCES ONLY',
  'CITED IN REAL ESSAYS',
  'NO ALGORITHMS',
  'ACCURACY FIRST',
  'BUILT FOR RESEARCH',
  'ZERO AI SLOP',
  'PEER REVIEWED SOURCES',
  'TRUSTED BY STUDENTS',
  'BIBLIOGRAPHY READY',
  'MLA. APA. CHICAGO.',
  'FIND IT. CITE IT. DONE.',
  'NO SEO FARMS',
  'SOURCES THAT HOLD UP',
  'QUALITY OVER QUANTITY',
]

export default function Footer() {
  const [index, setIndex] = useState(0)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const t = setInterval(() => {
      setOpacity(0)
      setTimeout(() => {
        setIndex(i => (i + 1) % TAGLINES.length)
        setOpacity(1)
      }, 300)
    }, 4000)
    return () => clearInterval(t)
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
        <a
          href="mailto:proof_dev@protonmail.com?subject=Issue Report"
          style={{ fontSize: '11px', color: '#2a2a2a', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#555')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
        >
          Report Issue
        </a>
        <a
          href="/educators"
          style={{ fontSize: '11px', color: '#2a2a2a', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#555')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
        >
          Educator Access
        </a>
      </div>
    </footer>
  )
}
