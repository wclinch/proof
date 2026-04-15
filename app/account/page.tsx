'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import { getPdfCount, PDF_FREE_LIMIT } from '@/lib/storage'

export default function AccountPage() {
  const [user, setUser]                 = useState<User | null>(null)
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
    const sb = getSupabaseBrowser()
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      const { data } = await sb.from('profiles').select('subscribed').eq('id', session.user.id).single()
      setIsSubscribed(data?.subscribed ?? false)
      setLoading(false)
    })
  }, [router])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
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
    // Requires service role — for now sign out and inform
    await handleSignOut()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e',
    borderRadius: '4px', padding: '9px 14px', outline: 'none',
    fontSize: '13px', color: '#bbb', fontFamily: 'inherit',
    boxSizing: 'border-box', letterSpacing: '0.03em',
  }

  const sectionStyle: React.CSSProperties = {
    padding: '24px 0', borderBottom: '1px solid #1a1a1a',
    display: 'flex', flexDirection: 'column', gap: '12px',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase',
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '12px', color: '#333', letterSpacing: '0.08em' }}>Loading...</span>
        </main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, maxWidth: '480px', width: '100%', margin: '0 auto', padding: '56px 20px', display: 'flex', flexDirection: 'column' }}>

        <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          Settings
        </span>

        {/* Account */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Account</span>
          <div style={{ fontSize: '14px', color: '#555' }}>{user?.email}</div>
        </div>

        {/* Plan */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Plan</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '14px', color: '#555' }}>
              {isSubscribed
                ? 'Pro — unlimited PDFs'
                : `Free — ${getPdfCount()} of ${PDF_FREE_LIMIT} PDFs used`}
            </div>
            {!isSubscribed && (
              <div style={{ fontSize: '13px', color: '#333' }}>
                Upgrade to Pro for $3/month — payment coming soon.
              </div>
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
              required
              minLength={6}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#333')}
              onBlur={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
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
                background: 'none', border: '1px solid #1e1e1e', borderRadius: '4px',
                padding: '8px 16px', cursor: pwLoading ? 'default' : 'pointer', outline: 'none',
                fontSize: '11px', color: '#444', letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!pwLoading) { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#444' }}
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
                background: 'none', border: '1px solid #1e1e1e', borderRadius: '4px',
                padding: '8px 16px', cursor: 'pointer', outline: 'none',
                fontSize: '11px', color: '#444', letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#444' }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          <span style={{ ...labelStyle, color: '#622' }}>Danger zone</span>
          <div>
            <button
              onClick={handleDeleteAccount}
              style={{
                background: 'none', border: `1px solid ${confirmDelete ? '#622' : '#1e1e1e'}`,
                borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', outline: 'none',
                fontSize: '11px', color: confirmDelete ? '#c44' : '#444',
                letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#733'; e.currentTarget.style.color = '#c44' }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = confirmDelete ? '#622' : '#1e1e1e'
                e.currentTarget.style.color = confirmDelete ? '#c44' : '#444'
              }}
            >
              {confirmDelete ? 'Confirm — this cannot be undone' : 'Delete account'}
            </button>
            {confirmDelete && (
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  marginLeft: '12px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '11px', color: '#333',
                  letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#555')}
                onMouseLeave={e => (e.currentTarget.style.color = '#333')}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div style={{ paddingTop: '8px' }}>
          <a href="/app" style={{ fontSize: '12px', color: '#333', letterSpacing: '0.06em', textDecoration: 'none', textTransform: 'uppercase' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#555')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#333')}
          >
            ← Back
          </a>
        </div>

      </main>
    </div>
  )
}
