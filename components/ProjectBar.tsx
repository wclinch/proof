'use client'
import { useApp } from '@/context/AppContext'

export default function ProjectBar() {
  const { user, cloudSyncing } = useApp()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: '44px', flexShrink: 0,
      borderBottom: '1px solid #1a1a1a',
    }}>
      <a href="/" style={{
        textDecoration: 'none', fontSize: '15px', fontWeight: 300,
        color: '#555', transition: 'color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = '#bbb')}
        onMouseLeave={e => (e.currentTarget.style.color = '#555')}
      >{'{'}</a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {cloudSyncing && (
          <span style={{ fontSize: '10px', color: '#444' }}>Saving...</span>
        )}
        {user ? (
          <a href="/account" style={{
            fontSize: '11px', color: '#555', textDecoration: 'none',
            maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            transition: 'color 0.15s',
          }}
            title={user.email}
            onMouseEnter={e => (e.currentTarget.style.color = '#999')}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >{user.email}</a>
        ) : (
          <a href="/auth" style={{
            fontSize: '11px', color: '#555', textDecoration: 'none',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#999')}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >Sign in</a>
        )}
      </div>
    </div>
  )
}
