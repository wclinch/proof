'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export default function ResetPage() {
  const [password, setPassword] = useState('')
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    const sb = getSupabaseBrowser()
    const { error } = await sb.auth.updateUser({ password })
    if (error) {
      setMsg({ text: error.message, ok: false })
      setLoading(false)
      return
    }
    setMsg({ text: 'Password updated. Redirecting...', ok: true })
    setTimeout(() => router.push('/app'), 1200)
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

          <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
            Set new password
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#333')}
              onBlur={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
            />
            {msg && (
              <div style={{ fontSize: '12px', color: msg.ok ? '#4a4' : '#a44', letterSpacing: '0.03em' }}>
                {msg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px', background: '#141414', border: '1px solid #2a2a2a',
                borderRadius: '4px', padding: '10px 20px', cursor: loading ? 'default' : 'pointer',
                fontSize: '12px', color: loading ? '#333' : '#777', letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: 'inherit', outline: 'none',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#bbb' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = loading ? '#333' : '#777' }}
            >
              {loading ? 'Updating...' : 'Set password →'}
            </button>
          </form>

        </div>
      </main>
    </div>
  )
}
