'use client'
import { useState, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import type { Project } from '@/lib/types'

export default function ProjectsModal() {
  const {
    showProjects, setShowProjects,
    projects, activeId,
    setProjects, updateProject, createProject, switchProject, deleteProject,
    projContextMenu, setProjContextMenu,
  } = useApp()

  const [editingProjId, setEditingProjId]             = useState<string | null>(null)
  const [projNameInput, setProjNameInput]             = useState('')
  const [confirmDeleteProjId, setConfirmDeleteProjId] = useState<string | null>(null)

  if (!showProjects) return null

  function handleRenameCommit(projId: string, fallback: string) {
    const name = projNameInput.trim() || fallback
    updateProject(projId, { name })
    setEditingProjId(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setShowProjects(false)}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#0d0d0d', border: '1px solid #1a1a1a',
            borderRadius: '6px', width: '320px', maxHeight: '400px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid #1a1a1a',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '12px', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Projects
            </span>
            <button
              onClick={createProject}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: '12px', color: '#555', letterSpacing: '0.06em',
                textTransform: 'uppercase', fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#999')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              New
            </button>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => switchProject(p.id)}
                onContextMenu={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setConfirmDeleteProjId(null)
                  setProjContextMenu({ projId: p.id, x: e.clientX, y: e.clientY })
                }}
                style={{
                  padding: '11px 20px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: p.id === activeId ? '#111' : 'transparent',
                  borderLeft: `2px solid ${p.id === activeId ? '#333' : 'transparent'}`,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { if (p.id !== activeId) e.currentTarget.style.background = '#0d0d0d' }}
                onMouseLeave={e => { if (p.id !== activeId) e.currentTarget.style.background = 'transparent' }}
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
                      fontSize: '13px', color: '#ccc', fontFamily: 'inherit',
                      padding: 0, letterSpacing: '0.03em',
                    }}
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: '13px', color: p.id === activeId ? '#ddd' : '#555', letterSpacing: '0.03em' }}>
                    {p.name}
                  </span>
                )}
                <span style={{ fontSize: '11px', color: '#333' }}>
                  {p.sources.length} {p.sources.length === 1 ? 'pdf' : 'pdfs'}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Project context menu */}
      {projContextMenu && (() => {
        const proj = projects.find(p => p.id === projContextMenu.projId)
        if (!proj) return null
        return (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', left: projContextMenu.x, top: projContextMenu.y,
              background: '#141414', border: '1px solid #2a2a2a',
              borderRadius: '4px', zIndex: 300, minWidth: '140px',
              overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            <button
              onClick={() => {
                setEditingProjId(proj.id)
                setProjNameInput(proj.name)
                setProjContextMenu(null)
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', padding: '9px 14px',
                cursor: 'pointer', fontSize: '12px', color: '#777',
                letterSpacing: '0.04em', fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Rename
            </button>
            <div style={{ height: '1px', background: '#1e1e1e' }} />
            {projects.length === 1 ? (
              <div style={{ padding: '9px 14px', fontSize: '12px', color: '#333', letterSpacing: '0.04em', userSelect: 'none' }}>
                {"Can't delete only project"}
              </div>
            ) : (
              <button
                onClick={() => {
                  if (confirmDeleteProjId === proj.id) {
                    deleteProject(proj.id)
                    setConfirmDeleteProjId(null)
                    setProjContextMenu(null)
                  } else {
                    setConfirmDeleteProjId(proj.id)
                  }
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', padding: '9px 14px',
                  cursor: 'pointer', fontSize: '12px', color: '#c55',
                  letterSpacing: '0.04em', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {confirmDeleteProjId === proj.id ? 'Confirm?' : 'Remove'}
              </button>
            )}
          </div>
        )
      })()}
    </>
  )
}
