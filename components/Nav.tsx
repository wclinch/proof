'use client'
import Link from 'next/link'

export default function Nav() {
  const linkStyle: React.CSSProperties = {
    fontSize: '11px', color: '#333', letterSpacing: '0.08em',
    textTransform: 'uppercase', textDecoration: 'none',
  }

  return (
    <nav style={{
      padding: '0 24px',
      height: '44px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #1a1a1a',
      flexShrink: 0,
    }}>
      <Link href="/app" style={{ textDecoration: 'none', fontSize: '15px', fontWeight: 300, color: '#555' }}>
        {'{'}
      </Link>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link href="/about"   style={linkStyle} onMouseEnter={undefined}>About</Link>
        <Link href="/privacy" style={linkStyle}>Privacy</Link>
        <a href="mailto:proof_official@protonmail.com" style={linkStyle}>Contact</a>
      </div>
    </nav>
  )
}
