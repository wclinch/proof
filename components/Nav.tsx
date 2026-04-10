'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <nav style={{
      padding: '24px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '15px', fontWeight: 600, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#f0f0f0',
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 300, letterSpacing: '-1px' }}>{'{'}</span>
          Proof
        </span>
      </Link>

      {!isHome && (
        <Link href="/" style={{
          fontSize: '12px', color: '#444', textDecoration: 'none',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = '#888')}
          onMouseLeave={e => (e.currentTarget.style.color = '#444')}
        >
          ← Home
        </Link>
      )}
    </nav>
  )
}
