'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'

export default function ProjectBar() {
  const {
    activeProject, activeId, projects,
    updateProject, setShowProjects, createProject, sources,
    user, cloudSyncing,
  } = useApp()

  const [editingName, setEditingName] = useState(false)
  const [projectName, setProjectName] = useState(activeProject?.name ?? '')
  const nameRef = useRef<HTMLInputElement>(null)

  const doneCount    = sources.filter(s => s.status === 'done').length
  const loadingCount = sources.filter(s => s.status === 'loading').length

  useEffect(() => {
    setProjectName(activeProject?.name ?? '')
    setEditingName(false)
  }, [activeProject?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function saveName() {
    if (!activeId) return
    const untitledCount = projects.filter(p => p.name.startsWith('untitled-')).length
    const name = projectName.trim() || `untitled-${untitledCount + 1}`
    updateProject(activeId, { name })
    setProjectName(name)
    setEditingName(false)
  }

  const linkStyle: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
    fontSize: '11px', color: '#666', letterSpacing: '0.08em',
    textTransform: 'uppercase', fontFamily: 'inherit', textDecoration: 'none',
    display: 'inline-block',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '0 24px', height: '44px', flexShrink: 0,
      borderBottom: '1px solid #1a1a1a', gap: '16px',
    }}>
      {/* Logo */}
      <a href="/" style={{ ...linkStyle, color: '#777', fontSize: '15px', fontWeight: 300, letterSpacing: 0, marginRight: '4px' }}>
        {'{'}
      </a>

      <div style={{ width: '1px', height: '14px', background: '#1a1a1a', flexShrink: 0 }} />

      {/* Project name */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {editingName ? (
          <input
            ref={nameRef}
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={saveName}
            onKeyDown={e => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') {
                setProjectName(activeProject?.name ?? '')
                setEditingName(false)
              }
            }}
            autoFocus
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: '11px', color: '#bbb', letterSpacing: '0.06em',
              textTransform: 'uppercase', fontFamily: 'inherit',
              padding: 0, margin: 0, height: '20px', lineHeight: '20px',
              boxSizing: 'border-box', width: '100%',
            }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            style={{
              ...linkStyle, cursor: 'text', color: '#777',
              maxWidth: '100%', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e => (e.currentTarget.style.color = '#777')}
          >
            {activeProject?.name ?? 'untitled'}
          </button>
        )}
      </div>

      {/* Status */}
      {sources.length > 0 && (
        <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.06em', flexShrink: 0 }}>
          {doneCount}/{sources.length}
          {loadingCount > 0 ? ' · analyzing...' : ''}
        </span>
      )}

      <div style={{ width: '1px', height: '14px', background: '#1a1a1a', flexShrink: 0 }} />

      {/* Actions */}
      <button
        onClick={() => setShowProjects(v => !v)}
        style={linkStyle}
        onMouseEnter={e => (e.currentTarget.style.color = '#999')}
        onMouseLeave={e => (e.currentTarget.style.color = '#666')}
      >
        Projects
      </button>
      <button
        onClick={createProject}
        style={linkStyle}
        onMouseEnter={e => (e.currentTarget.style.color = '#999')}
        onMouseLeave={e => (e.currentTarget.style.color = '#666')}
      >
        New
      </button>

      <div style={{ width: '1px', height: '14px', background: '#1a1a1a', flexShrink: 0 }} />

      <a href="/about" style={linkStyle}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#999'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#666'}
      >
        About
      </a>
      <a href="/privacy" style={linkStyle}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#999'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#666'}
      >
        Privacy
      </a>

      <div style={{ width: '1px', height: '14px', background: '#1a1a1a', flexShrink: 0 }} />

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {cloudSyncing && (
            <span style={{ fontSize: '10px', color: '#444', letterSpacing: '0.06em' }}>
              saving...
            </span>
          )}
          <a href="/account" style={{ ...linkStyle, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={user.email}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#999'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#666'}
          >
            {user.email}
          </a>
        </div>
      ) : (
        <a href="/auth" style={linkStyle}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#999'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#666'}
        >
          Sign in
        </a>
      )}
    </div>
  )
}
