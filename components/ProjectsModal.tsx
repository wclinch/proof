'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'

export default function ProjectsModal() {
  const {
    showProjects, setShowProjects,
    projects, activeId,
    updateProject, createProject, switchProject, deleteProject,
  } = useApp()

  const [editingProjId,      setEditingProjId]      = useState<string | null>(null)
  const [projNameInput,      setProjNameInput]       = useState('')
  const [menuProjId,         setMenuProjId]          = useState<string | null>(null)
  const [menuPos,            setMenuPos]             = useState<{ x: number; y: number } | null>(null)
  const [confirmDeleteProjId, setConfirmDeleteProjId] = useState<string | null>(null)
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Close on outside click
  useEffect(() => {
    if (!showProjects) return
    function onDown(e: MouseEvent) {
      const panel = document.getElementById('projects-panel')
      const menu  = document.getElementById('projects-ctx-menu')
      if (panel && !panel.contains(e.target as Node) &&
          !(menu && menu.contains(e.target as Node))) {
        setShowProjects(false)
        setMenuProjId(null)
        setMenuPos(null)
      }
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [showProjects, setShowProjects])

  if (!showProjects) return null

  function handleRenameCommit(projId: string, fallback: string) {
    const name = projNameInput.trim() || fallback
    updateProject(projId, { name })
    setEditingProjId(null)
  }

  function openMenu(projId: string) {
    const btn = menuBtnRefs.current[projId]
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    setConfirmDeleteProjId(null)
    setMenuProjId(projId)
    // Anchor to right edge of button so menu doesn't go off-screen
    setMenuPos({ x: window.innerWidth - rect.right, y: rect.bottom + 4 })
  }

  const ROW: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'none', border: 'none', padding: '9px 14px',
    cursor: 'pointer', fontSize: '11px', color: '#666',
    letterSpacing: '0.06em', fontFamily: 'inherit', outline: 'none',
  }

  return (
    <>
      {/* Dropdown panel — anchored below nav bar, right-aligned */}
      <div
        id="projects-panel"
        style={{
          position: 'fixed',
          top: '44px',
          left: '0',
          width: '200px',
          background: '#0c0c0c',
          borderRight: '1px solid #1a1a1a',
          borderBottom: '1px solid #1a1a1a',
          zIndex: 200,
          overflow: 'hidden',
        }}
      >
        {/* Project list — no header, just the list */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 88px)' }}>
          {projects.map(p => {
            const isActive = p.id === activeId
            return (
              <div
                key={p.id}
                onClick={() => { if (editingProjId !== p.id) { switchProject(p.id); setShowProjects(false) } }}
                style={{
                  padding: '9px 16px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: isActive ? '#111' : 'transparent',
                  borderLeft: `2px solid ${isActive ? '#333' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#0d0d0d' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                {editingProjId === p.id ? (
                  <input
                    autoFocus
                    value={projNameInput}
                    onChange={e => setProjNameInput(e.target.value)}
                    onFocus={e => e.target.select()}
                    onClick={e => e.stopPropagation()}
                    onBlur={() => handleRenameCommit(p.id, p.name)}
                    onKeyDown={e => {
                      e.stopPropagation()
                      if (e.key === 'Enter') handleRenameCommit(p.id, p.name)
                      if (e.key === 'Escape') setEditingProjId(null)
                    }}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      fontSize: '12px', color: '#ccc', fontFamily: 'inherit',
                      padding: 0, letterSpacing: '0.03em',
                    }}
                  />
                ) : (
                  <span style={{
                    flex: 1, fontSize: '12px',
                    color: isActive ? '#ccc' : '#888',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </span>
                )}
                <button
                  ref={el => { menuBtnRefs.current[p.id] = el }}
                  onClick={e => { e.stopPropagation(); openMenu(p.id) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
                    fontSize: '13px', color: '#555', letterSpacing: '0.1em',
                    fontFamily: 'inherit', lineHeight: 1, padding: '0 2px', flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >···</button>
              </div>
            )
          })}
        </div>

        {/* New workspace */}
        <div style={{ borderTop: '1px solid #1a1a1a' }}>
          <button
            onClick={createProject}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'none', border: 'none', padding: '9px 16px',
              cursor: 'pointer', fontSize: '11px', color: '#444',
              fontFamily: 'inherit', outline: 'none',
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#888')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
          >
            + New workspace
          </button>
        </div>
      </div>

      {/* Per-project options menu */}
      {menuProjId && menuPos && (() => {
        const proj = projects.find(p => p.id === menuProjId)
        if (!proj) return null
        return (
          <div
            id="projects-ctx-menu"
            style={{
              position: 'fixed', right: menuPos.x, top: menuPos.y,
              background: '#0f0f0f', border: '1px solid #222',
              zIndex: 300, minWidth: '130px',
              overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            <button
              onClick={() => {
                setEditingProjId(proj.id)
                setProjNameInput(proj.name)
                setMenuProjId(null)
                setMenuPos(null)
              }}
              style={ROW}
              onMouseEnter={e => { e.currentTarget.style.background = '#151515'; e.currentTarget.style.color = '#aaa' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#666' }}
            >
              Rename
            </button>
            <div style={{ height: '1px', background: '#1a1a1a' }} />
            {projects.length === 1 ? (
              <div style={{ padding: '9px 14px', fontSize: '11px', color: '#555', userSelect: 'none' }}>
                Can't delete only project
              </div>
            ) : (
              <button
                onClick={() => {
                  if (confirmDeleteProjId === proj.id) {
                    deleteProject(proj.id)
                    setConfirmDeleteProjId(null)
                    setMenuProjId(null)
                    setMenuPos(null)
                  } else {
                    setConfirmDeleteProjId(proj.id)
                  }
                }}
                style={{ ...ROW, color: confirmDeleteProjId === proj.id ? '#e55' : '#c55' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#151515')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {confirmDeleteProjId === proj.id ? 'Confirm?' : 'Delete'}
              </button>
            )}
          </div>
        )
      })()}
    </>
  )
}
