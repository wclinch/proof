'use client'
import Link from 'next/link'

export default function Nav() {
  const linkStyle: React.CSSProperties = {
    fontSize: '11px', color: '#666', letterSpacing: '0.08em',
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
      <Link href="/app" style={{ textDecoration: 'none', fontSize: '15px', fontWeight: 300, color: '#777' }}>
        {'{'}
      </Link>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link href="/about"   className="nav-link" style={linkStyle}>About</Link>
        <Link href="/privacy" className="nav-link" style={linkStyle}>Privacy</Link>
        <a href="mailto:proof_official@protonmail.com" className="nav-link" style={linkStyle}>Contact</a>
      </div>
    </nav>
  )
}
