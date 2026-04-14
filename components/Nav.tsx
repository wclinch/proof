'use client'
import Link from 'next/link'

export default function Nav() {
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
          fontSize: '22px', fontWeight: 300, color: '#e8e8e8',
        }}>
          {'{'}
        </span>
      </Link>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Link href="/about"   className="nav-link">About</Link>
        <Link href="/privacy" className="nav-link">Privacy</Link>
        <a href="mailto:proof_official@protonmail.com" className="nav-link">Contact</a>
      </div>
    </nav>
  )
}
