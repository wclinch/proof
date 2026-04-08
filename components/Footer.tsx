'use client'

export default function Footer() {
  return (
    <footer style={{
      padding: '24px 40px',
      borderTop: '1px solid #1a1a1a',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Proof — Vetted Academic Sources
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
