import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: '#080808', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '16px', fontFamily: 'inherit',
    }}>
      <span style={{ fontSize: '11px', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        404
      </span>
      <p style={{ fontSize: '14px', color: '#444', margin: 0 }}>
        Nothing here.
      </p>
      <Link href="/" style={{ fontSize: '12px', color: '#555', letterSpacing: '0.06em', textDecoration: 'none' }}>
        ← Go home
      </Link>
    </div>
  )
}
