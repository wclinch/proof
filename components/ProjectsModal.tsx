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

  const [editingProjId, setEditingProjId]           = useState<string | null>(null)
  const [projNameInput, setProjNameInput]           = useState('')
  const [confirmDeleteProjId, setConfirmDeleteProjId] = useState<string | null>(null)
  const [importError, setImportError]               = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  if (!showProjects) return null

  function handleRenameCommit(projId: string, fallback: string) {
    const name = projNameInput.trim() || fallback
    updateProject(projId, { name })
    setEditingProjId(null)
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `proof-projects-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null)
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Project[]
        if (!Array.isArray(parsed) || !parsed.every(p => p.id && p.name && Array.isArray(p.sources))) {
          setImportError('Invalid file format.')
          return
        }
        // Merge: add projects whose IDs don't already exist
        const existingIds = new Set(projects.map(p => p.id))
        const incoming    = parsed.filter(p => !existingIds.has(p.id))
        if (incoming.length === 0) {
          setImportError('All projects already exist.')
          return
        }
        // Ensure imported projects have all required fields
        const safe: Project[] = incoming.map(p => ({
          ...p,
          citations:     p.citations     ?? [],
          citationStyle: p.citationStyle ?? 'mla',
          draft:         p.draft         ?? '',
          draftTitle:    p.draftTitle    ?? '',
          draftCreated:  p.draftCreated  ?? false,
        }))
        setProjects(prev => [...prev, ...safe])
      } catch {
        setImportError('Could not read file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
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
                  {p.sources.length} {p.sources.length === 1 ? 'source' : 'sources'}
                </span>
              </div>
            ))}
          </div>

          {/* Footer: export / import */}
          <div style={{
            padding: '8px 20px', borderTop: '1px solid #111',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleExport}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
                  fontSize: '11px', color: '#333', letterSpacing: '0.06em',
                  textTransform: 'uppercase', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#666')}
                onMouseLeave={e => (e.currentTarget.style.color = '#333')}
              >
                Export
              </button>
              <button
                onClick={() => importRef.current?.click()}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
                  fontSize: '11px', color: '#333', letterSpacing: '0.06em',
                  textTransform: 'uppercase', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#666')}
                onMouseLeave={e => (e.currentTarget.style.color = '#333')}
              >
                Import
              </button>
              <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </div>
            {importError && (
              <span style={{ fontSize: '11px', color: '#733', letterSpacing: '0.04em' }}>{importError}</span>
            )}
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
