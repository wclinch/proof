'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export default function AuthPage() {
  const [mode, setMode]         = useState<'login' | 'signup'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [sentTo, setSentTo]     = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (window.location.search.includes('mode=signup')) setMode('signup')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const sb = getSupabaseBrowser()

    if (mode === 'signup') {
      const { data, error: err } = await sb.auth.signUp({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      // Create profile row — trigger handles this, but insert here as fallback (upsert = no-op if exists)
      if (data.user) {
        await sb.from('profiles').upsert({ id: data.user.id, subscribed: false }, { onConflict: 'id' })
      }
      setSentTo(email)
      setLoading(false)
      return
    } else {
      const { error: err } = await sb.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      router.push('/app')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e',
    borderRadius: '4px', padding: '10px 14px', outline: 'none',
    fontSize: '13px', color: '#bbb', fontFamily: 'inherit',
    boxSizing: 'border-box', letterSpacing: '0.03em',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {sentTo ? (
            /* ── Email sent confirmation ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
                Check your email
              </div>
              <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.75, margin: 0 }}>
                We sent a confirmation link to <span style={{ color: '#777' }}>{sentTo}</span>. Click it to activate your account and you&apos;ll land straight in the app.
              </p>
              <button
                onClick={() => { setSentTo(null); setMode('login') }}
                style={{
                  marginTop: '8px', background: 'none', border: 'none', padding: 0,
                  cursor: 'pointer', fontSize: '12px', color: '#333',
                  letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit',
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#555')}
                onMouseLeave={e => (e.currentTarget.style.color = '#333')}
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #1a1a1a', paddingBottom: '16px' }}>
                {(['login', 'signup'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(null) }}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      fontFamily: 'inherit', color: mode === m ? '#aaa' : '#333',
                    }}
                  >
                    {m === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#333')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#333')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
                />

                {error && (
                  <div style={{ fontSize: '12px', color: '#a44', letterSpacing: '0.03em', padding: '4px 0' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '6px',
                    background: '#141414', border: '1px solid #2a2a2a', borderRadius: '4px',
                    padding: '10px 20px', cursor: loading ? 'default' : 'pointer',
                    fontSize: '12px', color: loading ? '#333' : '#777',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#bbb' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = loading ? '#333' : '#777' }}
                >
                  {loading ? 'Please wait...' : mode === 'login' ? 'Sign in →' : 'Create account →'}
                </button>
              </form>

              {mode === 'signup' && (
                <p style={{ fontSize: '12px', color: '#2a2a2a', lineHeight: 1.6, margin: 0 }}>
                  By creating an account you agree that your use of this service is subject to the{' '}
                  <a href="/privacy" style={{ color: '#333', textDecoration: 'none' }}>privacy policy</a>.
                </p>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  )
}
