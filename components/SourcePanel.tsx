'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import SourceItem from './SourceItem'

export default function SourcePanel({ width }: { width: number }) {
  const {
    sources, uploadFiles, user,
    activeProject, activeId, projects,
    updateProject, switchProject, createProject, deleteProject,
  } = useApp()
  const [dragOver, setDragOver]             = useState(false)
  const [filterInput, setFilterInput]       = useState('')
  const [filter, setFilter]                 = useState('')
  const [dupMsg, setDupMsg]                 = useState(false)
  const [showWorkspaces, setShowWorkspaces] = useState(false)
  const [editingName, setEditingName]       = useState(false)
  const [nameInput, setNameInput]           = useState('')
  const [projMenu, setProjMenu]               = useState<{ id: string; x: number; y: number } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [renamingProjId, setRenamingProjId]   = useState<string | null>(null)
  const [renameInput, setRenameInput]         = useState('')
  const fileRef   = useRef<HTMLInputElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)
  const dupTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function untitledFallback(projId: string) {
    const idx = projects.findIndex(p => p.id === projId)
    return `untitled-${idx + 1}`
  }

  function saveWorkspaceName() {
    if (!activeId) return
    updateProject(activeId, { name: nameInput.trim() || untitledFallback(activeId) })
    setEditingName(false)
  }

  function handleProjContextMenu(e: React.MouseEvent, projId: string) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDeleteId(null)
    setProjMenu({ id: projId, x: e.clientX, y: e.clientY })
  }

  function handleRenameProject(projId: string, currentName: string) {
    setProjMenu(null)
    setRenamingProjId(projId)
    setRenameInput(currentName)
  }

  function commitRename(projId: string) {
    updateProject(projId, { name: renameInput.trim() || untitledFallback(projId) })
    setRenamingProjId(null)
  }

  function handleDeleteProject() {
    if (!projMenu) return
    if (confirmDeleteId === projMenu.id) {
      deleteProject(projMenu.id)
      setProjMenu(null)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(projMenu.id)
    }
  }

  function handleUpload(files: FileList | File[]) {
    const list = Array.from(files).filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    const hasDup = list.some(f => sources.some(s => s.label === f.name))
    if (hasDup) {
      setDupMsg(true)
      if (dupTimer.current) clearTimeout(dupTimer.current)
      dupTimer.current = setTimeout(() => setDupMsg(false), 3000)
    }
    uploadFiles(files)
  }

  useEffect(() => {
    const t = setTimeout(() => setFilter(filterInput), 150)
    return () => clearTimeout(t)
  }, [filterInput])

  useEffect(() => {
    return () => { if (dupTimer.current) clearTimeout(dupTimer.current) }
  }, [])

  const shell: React.CSSProperties = {
    margin: '10px 10px 0',
    padding: '11px 14px',
    background: '#0d0d0d',
    border: '1px solid #1a1a1a',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ width, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Workspace row ── */}
      <div style={{ flexShrink: 0 }}>
        <div
          onClick={() => { if (!editingName) setShowWorkspaces(x => !x) }}
          style={{
            padding: '0 14px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', borderBottom: '1px solid #1a1a1a',
            transition: 'background 0.1s',
          }}
        >
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onFocus={e => e.target.select()}
              onBlur={saveWorkspaceName}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter') saveWorkspaceName()
                if (e.key === 'Escape') setEditingName(false)
              }}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: '12px', color: '#ccc', fontFamily: 'inherit', padding: 0,
              }}
            />
          ) : (
            <span
              style={{ fontSize: '12px', color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onDoubleClick={e => { e.stopPropagation(); setNameInput(activeProject?.name ?? ''); setEditingName(true) }}
            >
              {activeProject?.name ?? 'untitled'}
            </span>
          )}
          {!editingName && (
            <button
              onClick={e => { e.stopPropagation(); setShowWorkspaces(x => !x) }}
              style={{
                background: 'none', border: 'none', padding: '2px 4px',
                cursor: 'pointer', fontSize: '12px', color: '#444',
                fontFamily: 'inherit', outline: 'none', lineHeight: 1, flexShrink: 0,
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
              onMouseLeave={e => (e.currentTarget.style.color = '#444')}
            >{showWorkspaces ? '▴' : '▾'}</button>
          )}
        </div>

        {showWorkspaces && (
          <div style={{ borderBottom: '1px solid #1a1a1a', background: '#090909' }}>
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => { if (renamingProjId !== p.id) switchProject(p.id) }}
                onContextMenu={e => handleProjContextMenu(e, p.id)}
                style={{
                  padding: '7px 14px', fontSize: '12px', cursor: 'pointer',
                  color: p.id === activeId ? '#ccc' : '#666',
                  borderLeft: `2px solid ${p.id === activeId ? '#333' : 'transparent'}`,
                  transition: 'color 0.1s',
                }}
                onMouseEnter={e => { if (p.id !== activeId && renamingProjId !== p.id) e.currentTarget.style.color = '#999' }}
                onMouseLeave={e => { if (p.id !== activeId) e.currentTarget.style.color = '#666' }}
              >
                {renamingProjId === p.id ? (
                  <input
                    autoFocus
                    value={renameInput}
                    onChange={e => setRenameInput(e.target.value)}
                    onFocus={e => e.target.select()}
                    onClick={e => e.stopPropagation()}
                    onBlur={() => commitRename(p.id)}
                    onKeyDown={e => {
                      e.stopPropagation()
                      if (e.key === 'Enter') commitRename(p.id)
                      if (e.key === 'Escape') setRenamingProjId(null)
                    }}
                    style={{
                      background: 'transparent', border: 'none', outline: 'none',
                      width: '100%', fontSize: '12px', color: '#ccc',
                      fontFamily: 'inherit', padding: 0,
                    }}
                  />
                ) : p.name}
              </div>
            ))}
            <div
              onClick={() => { createProject() }}
              style={{
                padding: '8px 14px', fontSize: '11px', color: '#444', cursor: 'pointer',
                borderTop: '1px solid #111', transition: 'color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#777')}
              onMouseLeave={e => (e.currentTarget.style.color = '#444')}
            >
              + New workspace
            </div>
          </div>
        )}
      </div>

      {/* ── Drop zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false)
          const pdfs = Array.from(e.dataTransfer.files).filter(f =>
            f.type === 'application/pdf' || f.name.endsWith('.pdf'))
          if (pdfs.length) handleUpload(pdfs)
        }}
        onClick={() => fileRef.current?.click()}
        style={{
          ...shell,
          background: dragOver ? '#141414' : '#0d0d0d',
          borderColor: dragOver ? '#333' : '#1a1a1a',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '11px', color: '#666', letterSpacing: '0.04em', flex: 1 }}>
          {dragOver ? 'Drop to add' : 'Add document'}
        </span>
      </div>
      <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.length) { handleUpload(e.target.files); e.target.value = '' } }}
      />
      {dupMsg && (
        <div style={{ margin: '6px 10px 0', fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 2px' }}>
          pdf already added.
        </div>
      )}

      {/* ── Source list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, marginTop: '8px', borderTop: '1px solid #1a1a1a' }}>
        {sources.length > 1 && (
          <div
            style={{ ...shell, cursor: 'text', padding: '9px 14px' }}
            onClick={() => filterRef.current?.focus()}
          >
            <input
              ref={filterRef}
              className="sp-input"
              value={filterInput}
              onChange={e => setFilterInput(e.target.value)}
              placeholder="filter..."
              style={{
                flex: 1,
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: '12px', fontFamily: 'inherit',
                letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#555',
              }}
            />
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '4px' }}>
          {sources.length === 0
            ? <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#888', lineHeight: 1.6 }}>Drop a PDF or click above to browse.</span>
                <span style={{ fontSize: '11px', color: '#666', lineHeight: 1.6 }}>Right-click a document to rename or remove it.</span>
              </div>
            : (() => {
                const q = filter.trim().toLowerCase()
                const visible = q
                  ? sources.filter(s => (s.label || s.raw).toLowerCase().includes(q))
                  : sources
                return visible.length === 0
                  ? <div style={{ padding: '20px 14px', fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase' }}>No results</div>
                  : visible.map(src => <SourceItem key={src.id} src={src} />)
              })()
          }
        </div>
      </div>

      {/* Project context menu */}
      {projMenu && (() => {
        const canDelete = projects.length > 1
        return (
          <>
            <div onClick={() => { setProjMenu(null); setConfirmDeleteId(null) }}
              style={{ position: 'fixed', inset: 0, zIndex: 298 }} />
            <div style={{
              position: 'fixed', left: projMenu.x, top: projMenu.y, zIndex: 299,
              background: '#0f0f0f', border: '1px solid #222',
              minWidth: '150px', overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}>
              <button
                onClick={() => {
                  const p = projects.find(x => x.id === projMenu.id)
                  if (p) handleRenameProject(p.id, p.name)
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', padding: '9px 14px',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', color: '#777',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Rename
              </button>
              <div style={{ height: '1px', background: '#1a1a1a' }} />
              {canDelete ? (
                <button
                  onClick={handleDeleteProject}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', padding: '9px 14px',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
                    color: confirmDeleteId === projMenu.id ? '#e55' : '#c55',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {confirmDeleteId === projMenu.id ? 'Remove?' : 'Remove workspace'}
                </button>
              ) : (
                <div style={{ padding: '9px 14px', fontSize: '12px', color: '#444' }}>
                  Can't remove only workspace
                </div>
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}
