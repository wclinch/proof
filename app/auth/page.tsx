'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

type Mode = 'login' | 'signup' | 'forgot'

export default function AuthPage() {
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [sentTo, setSentTo]     = useState<string | null>(null)
  const [sentType, setSentType] = useState<'confirm' | 'reset'>('confirm')
  const router = useRouter()

  useEffect(() => {
    if (window.location.search.includes('mode=signup')) setMode('signup')
  }, [])

  function switchMode(m: Mode) { setMode(m); setError(null); setSentTo(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const sb = getSupabaseBrowser()

    if (mode === 'signup') {
      const { data, error: err } = await sb.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/app` },
      })
      if (err) { setError(err.message); setLoading(false); return }
      if (data.session) { router.push('/app'); return }
      setSentType('confirm'); setSentTo(email); setLoading(false); return
    }

    if (mode === 'login') {
      const { error: err } = await sb.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      router.push('/app'); return
    }

    if (mode === 'forgot') {
      const origin = window.location.origin
      const { error: err } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/auth/reset`,
      })
      if (err) { setError(err.message); setLoading(false); return }
      setSentType('reset'); setSentTo(email); setLoading(false); return
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0d0d0d', border: '1px solid #1a1a1a',
    borderRadius: '4px', padding: '10px 14px', outline: 'none',
    fontSize: '13px', color: '#bbb', fontFamily: 'inherit',
    boxSizing: 'border-box', letterSpacing: '0.03em',
  }

  const backBtn: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontSize: '12px', color: '#777', letterSpacing: '0.06em',
    textTransform: 'uppercase', fontFamily: 'inherit', textAlign: 'left',
  }

  const submitBtn = (disabled: boolean): React.CSSProperties => ({
    marginTop: '6px', background: '#0f0f0f', border: '1px solid #1a1a1a',
    borderRadius: '4px', padding: '10px 20px', cursor: disabled ? 'default' : 'pointer',
    fontSize: '12px', color: disabled ? '#444' : '#777', letterSpacing: '0.08em',
    textTransform: 'uppercase', fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.15s, color 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {sentTo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
                Check your email
              </div>
              <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
                {sentType === 'confirm'
                  ? <>We sent a confirmation link to <span style={{ color: '#777' }}>{sentTo}</span>. Click it to activate your account.</>
                  : <>We sent a password reset link to <span style={{ color: '#777' }}>{sentTo}</span>. Click it to set a new password.</>
                }
              </p>
              <button
                onClick={() => switchMode('login')}
                style={backBtn}
                onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                onMouseLeave={e => (e.currentTarget.style.color = '#777')}
              >
                ← Back to sign in
              </button>
              <a
                href="/"
                style={{ ...backBtn, display: 'inline-block', textDecoration: 'none', color: '#444' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#777')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}
              >
                ← Home
              </a>
            </div>

          ) : mode === 'forgot' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #1a1a1a', paddingBottom: '16px' }}>
                <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa' }}>
                  Reset password
                </span>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="email" placeholder="Email" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#333')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
                />
                {error && <div style={{ fontSize: '12px', color: '#a44', letterSpacing: '0.03em' }}>{error}</div>}
                <button
                  type="submit" disabled={loading}
                  style={submitBtn(loading)}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#aaa' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = loading ? '#444' : '#777' }}
                >
                  {loading ? 'Sending...' : 'Send reset link →'}
                </button>
              </form>
              <button
                onClick={() => switchMode('login')}
                style={backBtn}
                onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                onMouseLeave={e => (e.currentTarget.style.color = '#777')}
              >
                ← Back to sign in
              </button>
              <a
                href="/"
                style={{ ...backBtn, display: 'inline-block', textDecoration: 'none', color: '#444' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#777')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}
              >
                ← Home
              </a>
            </div>

          ) : (
            <>
              <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #1a1a1a', paddingBottom: '16px' }}>
                {(['login', 'signup'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      fontFamily: 'inherit', color: mode === m ? '#bbb' : '#777',
                    }}
                  >
                    {m === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="email" placeholder="Email" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#333')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
                />
                <input
                  type="password" placeholder="Password" value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={6}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#333')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
                />
                {error && <div style={{ fontSize: '12px', color: '#a44', letterSpacing: '0.03em', padding: '4px 0' }}>{error}</div>}
                <button
                  type="submit" disabled={loading}
                  style={submitBtn(loading)}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#aaa' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = loading ? '#444' : '#777' }}
                >
                  {loading ? 'Please wait...' : mode === 'login' ? 'Sign in →' : 'Create account →'}
                </button>
              </form>

              {mode === 'login' && (
                <button
                  onClick={() => switchMode('forgot')}
                  style={backBtn}
                  onMouseEnter={e => (e.currentTarget.style.color = '#777')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#444')}
                >
                  Forgot password?
                </button>
              )}

              {mode === 'signup' && (
                <p style={{ fontSize: '12px', color: '#777', lineHeight: 1.6, margin: 0 }}>
                  By creating an account you agree that your use of this service is subject to the{' '}
                  <a href="/privacy" className="nav-link" style={{ fontSize: '12px' }}>privacy policy</a>.
                </p>
              )}

              <a
                href="/"
                style={{ ...backBtn, display: 'inline-block', textDecoration: 'none', color: '#444' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#777')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}
              >
                ← Home
              </a>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
