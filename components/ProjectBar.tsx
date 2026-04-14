'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'

export default function ProjectBar() {
  const {
    activeProject, activeId, projects,
    updateProject, setShowProjects, createProject, sources,
  } = useApp()

  const [editingName, setEditingName] = useState(false)
  const [projectName, setProjectName] = useState(activeProject?.name ?? '')
  const nameRef = useRef<HTMLInputElement>(null)

  const doneCount    = sources.filter(s => s.status === 'done').length
  const loadingCount = sources.filter(s => s.status === 'loading').length

  // Sync name when active project changes
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

  const btnStyle: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
    fontSize: '11px', color: '#444', letterSpacing: '0.08em',
    textTransform: 'uppercase', fontFamily: 'inherit',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px', height: '40px', flexShrink: 0,
      borderBottom: '1px solid #1a1a1a',
    }}>
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
              fontSize: '12px', color: '#aaa', letterSpacing: '0.06em',
              textTransform: 'uppercase', fontFamily: 'inherit',
              padding: 0, margin: 0, height: '20px', lineHeight: '20px',
              boxSizing: 'border-box', width: '100%',
            }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            style={{
              ...btnStyle, cursor: 'text',
              maxWidth: '100%', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#777')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
          >
            {activeProject?.name ?? 'untitled'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {sources.length > 0 && (
          <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.06em' }}>
            {doneCount}/{sources.length} analyzed
            {loadingCount > 0 ? ' · analyzing...' : ''}
          </span>
        )}
        <button
          onClick={() => setShowProjects(v => !v)}
          style={btnStyle}
          onMouseEnter={e => (e.currentTarget.style.color = '#777')}
          onMouseLeave={e => (e.currentTarget.style.color = '#444')}
        >
          Projects
        </button>
        <button
          onClick={createProject}
          style={btnStyle}
          onMouseEnter={e => (e.currentTarget.style.color = '#777')}
          onMouseLeave={e => (e.currentTarget.style.color = '#444')}
        >
          New
        </button>
      </div>
    </div>
  )
}
