'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase'

function PasswordInput({ value, onChange, onKeyDown, placeholder }: {
  value: string
  onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? '••••••••'}
        style={{
          width: '100%',
          background: '#111', border: '1px solid #1e1e1e', borderRadius: '6px',
          padding: '14px 44px 14px 16px', color: '#f0f0f0', fontSize: '14px', outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: '13px',
          padding: 0, lineHeight: 1,
        }}
      >
        {show ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  )
}

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleReset() {
    if (!password || !confirm) return
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/'), 2000)
    }
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
          <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Password updated</h1>
            <p style={{ fontSize: '13px', color: '#444', lineHeight: 1.7, margin: 0 }}>
              Your password has been changed. Redirecting you home...
            </p>
          </div>
        </main>
      <Footer />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Set new password</h1>
            <p style={{ fontSize: '13px', color: '#444', margin: 0 }}>Choose a new password for your account.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase' }}>New Password</label>
              <PasswordInput value={password} onChange={setPassword} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Confirm Password</label>
              <PasswordInput value={confirm} onChange={setConfirm} onKeyDown={e => e.key === 'Enter' && handleReset()} />
            </div>

            {error && (
              <p style={{ fontSize: '12px', color: '#888888', letterSpacing: '0.02em', margin: 0 }}>{error}</p>
            )}

            <button
              onClick={handleReset}
              disabled={loading}
              style={{
                background: '#f0f0f0', color: '#0a0a0a', border: 'none', borderRadius: '6px',
                padding: '14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                letterSpacing: '0.04em', marginTop: '4px', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
