'use client'
import { useApp } from '@/context/AppContext'
import { PDF_FREE_LIMIT } from '@/lib/storage'

export default function PaywallModal() {
  const { showPaywall, setShowPaywall, user } = useApp()
  if (!showPaywall) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setShowPaywall(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#0f0f0f', border: '1px solid #222',
        borderRadius: '6px', padding: '32px 36px',
        zIndex: 301, width: '100%', maxWidth: '380px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Free limit reached
        </div>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.75, margin: 0 }}>
          You&apos;ve used all {PDF_FREE_LIMIT} free sources. Create an account and subscribe to keep going — $3/month, no limits.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {!user ? (
            <>
              <a
                href="/auth?mode=signup"
                style={{
                  display: 'block', textAlign: 'center',
                  background: '#1a1a1a', border: '1px solid #1a1a1a',
                  borderRadius: '4px', padding: '10px 20px',
                  fontSize: '12px', color: '#bbb', letterSpacing: '0.08em',
                  textTransform: 'uppercase', textDecoration: 'none',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#444'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1a1a'; (e.currentTarget as HTMLElement).style.color = '#bbb' }}
              >
                Create account
              </a>
              <a
                href="/auth"
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '10px 20px',
                  fontSize: '12px', color: '#444', letterSpacing: '0.08em',
                  textTransform: 'uppercase', textDecoration: 'none',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#777')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#333')}
              >
                Sign in
              </a>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: '#444', textAlign: 'center', padding: '8px 0' }}>
              Payment coming soon — <a href="/account" style={{ color: '#555', textDecoration: 'none' }}>view account</a>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowPaywall(false)}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '16px', color: '#444', padding: '4px', lineHeight: 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#777')}
          onMouseLeave={e => (e.currentTarget.style.color = '#333')}
        >
          ×
        </button>
      </div>
    </>
  )
}
