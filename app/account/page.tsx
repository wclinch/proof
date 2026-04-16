'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import { loadProjects, PDF_FREE_LIMIT } from '@/lib/storage'

export default function AccountPage() {
  const [pdfCount, setPdfCount]         = useState(0)
  const [user, setUser]                 = useState<User | null>(null)
  const [accessToken, setAccessToken]   = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading]           = useState(true)

  // Change password
  const [newPassword, setNewPassword]   = useState('')
  const [pwMsg, setPwMsg]               = useState<{ text: string; ok: boolean } | null>(null)
  const [pwLoading, setPwLoading]       = useState(false)

  // Delete account confirm
  const [confirmDelete, setConfirmDelete] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const projects = loadProjects()
    const count = projects.reduce(
      (acc, p) => acc + p.sources.filter((s: { status: string }) => s.status !== 'error').length, 0
    )
    setPdfCount(count)

    const sb = getSupabaseBrowser()
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      setAccessToken(session.access_token)
      const { data } = await (sb.from as any)('profiles').select('subscribed').eq('id', session.user.id).single() as { data: { subscribed: boolean } | null }
      setIsSubscribed(data?.subscribed ?? false)
      setLoading(false)
    })
  }, [router])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (!newPassword) return
    if (newPassword.length < 6) { setPwMsg({ text: 'Password must be at least 6 characters.', ok: false }); return }
    setPwLoading(true)
    const sb = getSupabaseBrowser()
    const { error } = await sb.auth.updateUser({ password: newPassword })
    if (error) setPwMsg({ text: error.message, ok: false })
    else { setPwMsg({ text: 'Password updated.', ok: true }); setNewPassword('') }
    setPwLoading(false)
  }

  async function handleSignOut() {
    const sb = getSupabaseBrowser()
    await sb.auth.signOut()
    router.push('/')
  }

  async function handleDeleteAccount() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    const sb = getSupabaseBrowser()
    const { data: { session } } = await sb.auth.getSession()
    if (!session) return
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      await sb.auth.signOut()
      router.push('/')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0d0d0d', border: '1px solid #1a1a1a',
    borderRadius: '4px', padding: '9px 14px', outline: 'none',
    fontSize: '13px', color: '#bbb', fontFamily: 'inherit',
    boxSizing: 'border-box', letterSpacing: '0.03em',
  }

  const sectionStyle: React.CSSProperties = {
    padding: '24px 0', borderBottom: '1px solid #1a1a1a',
    display: 'flex', flexDirection: 'column', gap: '12px',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px', color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase',
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '12px', color: '#777', letterSpacing: '0.08em' }}>Loading...</span>
        </main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, maxWidth: '480px', width: '100%', margin: '0 auto', padding: '56px 20px', display: 'flex', flexDirection: 'column' }}>

        <span style={{ fontSize: '11px', color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          Settings
        </span>

        {/* Account */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Account</span>
          <div style={{ fontSize: '14px', color: '#999' }}>{user?.email}</div>
        </div>

        {/* Plan */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Plan</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '14px', color: '#999' }}>
              {isSubscribed
                ? 'Pro — unlimited sources'
                : `Free — ${pdfCount} of ${PDF_FREE_LIMIT} sources used`}
            </div>
            {!isSubscribed ? (
              <button
                onClick={async () => {
                  if (!accessToken) return
                  const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { authorization: `Bearer ${accessToken}` },
                  })
                  const { url } = await res.json()
                  if (url) window.location.href = url
                }}
                style={{
                  alignSelf: 'flex-start',
                  background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '4px',
                  padding: '8px 16px', cursor: 'pointer', outline: 'none',
                  fontSize: '11px', color: '#555', letterSpacing: '0.08em',
                  textTransform: 'uppercase', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#bbb' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#777' }}
              >
                Upgrade to Pro — $3/month →
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (!accessToken) return
                  const res = await fetch('/api/stripe/portal', {
                    method: 'POST',
                    headers: { authorization: `Bearer ${accessToken}` },
                  })
                  const { url } = await res.json()
                  if (url) window.location.href = url
                }}
                style={{
                  alignSelf: 'flex-start',
                  background: 'none', border: '1px solid #1a1a1a', borderRadius: '4px',
                  padding: '8px 16px', cursor: 'pointer', outline: 'none',
                  fontSize: '11px', color: '#777', letterSpacing: '0.08em',
                  textTransform: 'uppercase', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#777' }}
              >
                Manage subscription
              </button>
            )}
          </div>
        </div>

        {/* Change password */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Change password</span>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#333')}
              onBlur={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
            />
            {pwMsg && (
              <div style={{ fontSize: '12px', color: pwMsg.ok ? '#4a4' : '#a44', letterSpacing: '0.03em' }}>
                {pwMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={pwLoading}
              style={{
                alignSelf: 'flex-start',
                background: 'none', border: '1px solid #1a1a1a', borderRadius: '4px',
                padding: '8px 16px', cursor: pwLoading ? 'default' : 'pointer', outline: 'none',
                fontSize: '11px', color: '#777', letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!pwLoading) { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#777' }}
            >
              {pwLoading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Session</span>
          <div>
            <button
              onClick={handleSignOut}
              style={{
                background: 'none', border: '1px solid #1a1a1a', borderRadius: '4px',
                padding: '8px 16px', cursor: 'pointer', outline: 'none',
                fontSize: '11px', color: '#777', letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#aaa' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#777' }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          <span style={{ ...labelStyle, color: '#a44' }}>Danger zone</span>
          <div>
            <button
              onClick={handleDeleteAccount}
              style={{
                background: 'none', border: `1px solid ${confirmDelete ? '#933' : '#1a1a1a'}`,
                borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', outline: 'none',
                fontSize: '11px', color: confirmDelete ? '#e55' : '#a44',
                letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#a44'; e.currentTarget.style.color = '#f66' }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = confirmDelete ? '#933' : '#1a1a1a'
                e.currentTarget.style.color = confirmDelete ? '#e55' : '#a44'
              }}
            >
              {confirmDelete ? 'Confirm — this cannot be undone' : 'Delete account'}
            </button>
            {confirmDelete && (
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  marginLeft: '12px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '11px', color: '#777',
                  letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#777')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div style={{ paddingTop: '8px' }}>
          <a href="/app" style={{ fontSize: '12px', color: '#777', letterSpacing: '0.06em', textDecoration: 'none', textTransform: 'uppercase' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#777')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#333')}
          >
            ← Back
          </a>
        </div>

      </main>
    </div>
  )
}
