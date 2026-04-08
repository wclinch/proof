'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user?.email ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user?.email ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function navLink(href: string, label: string) {
    const active = pathname === href
    return (
      <Link href={href}
        style={{
          color: active ? '#f0f0f0' : '#666',
          textDecoration: 'none',
          fontSize: '13px',
          letterSpacing: '0.05em',
          paddingBottom: '4px',
          borderBottom: active ? '1px solid #f0f0f0' : '1px solid transparent',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#aaa' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#666' }}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav style={{
      padding: '24px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <Link href="/"
        style={{ textDecoration: 'none', transition: 'opacity 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.6')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <span style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '15px', fontWeight: 600, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#f0f0f0',
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 300, letterSpacing: '-1px' }}>
            {'{'}
          </span>
          Proof
        </span>
      </Link>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        {navLink('/', 'Search')}
        {navLink('/about', 'About')}
        {user && navLink('/saved', 'Saved')}
        {user ? (
          <>
            <span style={{ fontSize: '12px', color: '#555', letterSpacing: '0.04em' }}>{user}</span>
            <button onClick={signOut}
              style={{
                background: 'none', border: '1px solid #1e1e1e', color: '#555',
                fontSize: '12px', padding: '7px 16px', borderRadius: '5px',
                cursor: 'pointer', letterSpacing: '0.04em', transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#1e1e1e' }}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link href="/signin" style={{
            background: '#111', border: '1px solid #1e1e1e', color: '#888',
            fontSize: '12px', padding: '7px 16px', borderRadius: '5px',
            textDecoration: 'none', letterSpacing: '0.04em',
          }}>
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
