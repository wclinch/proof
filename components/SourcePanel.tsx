'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import SourceItem from './SourceItem'

export default function SourcePanel({ width }: { width: number | string }) {
  const {
    sources, uploadFiles, moveSource, addUrl,
    projects, activeId, activeProject,
    createProject, switchProject, updateProject, deleteProject,
  } = useApp()

  // ── Workspace popover state ────────────────────────────────────────────────
  const [projOpen, setProjOpen]             = useState(false)
  const [projPos, setProjPos]               = useState<{ left: number; top: number; width: number } | null>(null)
  const [editingProjId, setEditingProjId]   = useState<string | null>(null)
  const [projNameInput, setProjNameInput]   = useState('')
  const [menuProjId, setMenuProjId]         = useState<string | null>(null)
  const [menuPos, setMenuPos]               = useState<{ top: number; left: number } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  function openProjMenu() {
    if (projOpen) { setProjOpen(false); setProjPos(null); return }
    if (!toggleRef.current) return
    const r = toggleRef.current.getBoundingClientRect()
    setProjPos({ left: r.left, top: r.bottom, width: r.width })
    setProjOpen(true)
  }

  function commitRename(projId: string, fallback: string) {
    updateProject(projId, { name: projNameInput.trim() || fallback })
    setEditingProjId(null)
  }

  useEffect(() => {
    if (!menuProjId) return
    function onDown(e: MouseEvent) {
      const menu = document.getElementById('proj-ctx-menu')
      if (menu && !menu.contains(e.target as Node)) {
        setMenuProjId(null); setMenuPos(null)
      }
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [menuProjId])

  // ── Source panel state ─────────────────────────────────────────────────────
  const [toggleHover, setToggleHover] = useState(false)
  const [dragOver, setDragOver]       = useState(false)
  const [addHover, setAddHover]       = useState(false)
  const [addingUrl, setAddingUrl]     = useState(false)
  const [urlInput, setUrlInput]       = useState('')
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [filterInput, setFilterInput] = useState('')
  const [filter, setFilter]           = useState('')
  const [dupMsg, setDupMsg]           = useState(false)
  const [draggingId, setDraggingId]   = useState<string | null>(null)
  const [liveOrder, setLiveOrder]     = useState<string[] | null>(null)
  const [clockOpen, setClockOpen]     = useState(false)

  const fileRef   = useRef<HTMLInputElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)
  const dupTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleUpload(files: FileList | File[]) {
    const list = Array.from(files).filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') ||
      f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(f.name)
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

  useEffect(() => () => { if (dupTimer.current) clearTimeout(dupTimer.current) }, [])

  function handleItemDragStart(id: string) {
    setDraggingId(id)
    setLiveOrder(sources.map(s => s.id))
  }

  function handleItemDragEnd() {
    if (draggingId && liveOrder) {
      const toIndex = liveOrder.indexOf(draggingId)
      if (toIndex !== -1) moveSource(draggingId, toIndex)
    }
    setDraggingId(null)
    setLiveOrder(null)
  }

  function handleListDragOver(e: React.DragEvent) {
    if (!draggingId || !liveOrder || !listRef.current) return
    if (e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    const items = listRef.current.querySelectorAll<HTMLElement>('[data-src-id]')
    if (!items.length) return
    let insertIdx = liveOrder.length
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect()
      if (e.clientY < rect.top + rect.height * 0.5) { insertIdx = i; break }
    }
    const without = liveOrder.filter(id => id !== draggingId)
    const next    = [...without]
    next.splice(insertIdx, 0, draggingId)
    if (next.join() !== liveOrder.join()) setLiveOrder(next)
  }

  function handleListDrop(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('Files')) return
    e.stopPropagation()
  }

  const shell: React.CSSProperties = {
    margin: '10px 10px 0', padding: '11px 14px',
    background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '4px',
    display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'border-color 0.15s',
  }

  const q = filter.trim().toLowerCase()
  const orderedSources = liveOrder
    ? liveOrder.map(id => sources.find(s => s.id === id)).filter(Boolean) as typeof sources
    : sources
  const visible = orderedSources.filter(s => {
    if (q && !(s.label || s.raw).toLowerCase().includes(q)) return false
    return true
  })

  const ROW_STYLE: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'none', border: 'none', padding: '9px 14px',
    cursor: 'pointer', fontSize: '12px', color: '#777',
    letterSpacing: '0.02em', fontFamily: 'inherit',
  }

  return (
    <div style={{ width, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Workspace header */}
      {!clockOpen && <button
        ref={toggleRef}
        onClick={openProjMenu}
        onMouseEnter={() => setToggleHover(true)}
        onMouseLeave={() => setToggleHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '0 14px', height: '36px', flexShrink: 0,
          background: projOpen || toggleHover ? '#0d0d0d' : 'none',
          border: 'none', borderBottom: '1px solid #1a1a1a',
          cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
          width: '100%', textAlign: 'left', transition: 'background 0.15s',
        }}
      >
        <span style={{
          flex: 1, fontSize: '12px',
          color: projOpen || toggleHover ? '#ccc' : '#999',
          letterSpacing: '0.02em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'color 0.15s',
        }}>
          {activeProject?.name ?? 'Workspace'}
        </span>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none"
          stroke={projOpen || toggleHover ? '#999' : '#555'} strokeWidth="1.2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transition: 'transform 0.15s, stroke 0.15s', transform: projOpen ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M1 1l3 3 3-3" />
        </svg>
      </button>}

      {/* Floating workspace popover */}
      {projOpen && projPos && (
        <div
          id="proj-popover"
          style={{
            position: 'fixed', left: projPos.left, top: projPos.top,
            width: projPos.width,
            background: '#0c0c0c', borderLeft: '1px solid #222', borderRight: '1px solid #222', borderBottom: '1px solid #222',
            zIndex: 300, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {projects.map(p => {
            const isActive = p.id === activeId
            return (
              <div
                key={p.id}
                onClick={() => { if (editingProjId === p.id) return; switchProject(p.id) }}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(null); setMenuProjId(p.id); setMenuPos({ top: e.clientY, left: e.clientX }) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '9px 14px', cursor: 'pointer',
                  background: isActive ? '#161616' : 'transparent',
                  userSelect: 'none',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#111' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                {editingProjId === p.id ? (
                  <input
                    autoFocus
                    value={projNameInput}
                    onChange={e => setProjNameInput(e.target.value)}
                    onFocus={e => e.target.select()}
                    onClick={e => e.stopPropagation()}
                    onBlur={() => commitRename(p.id, p.name)}
                    onKeyDown={e => {
                      e.stopPropagation()
                      if (e.key === 'Enter') commitRename(p.id, p.name)
                      if (e.key === 'Escape') setEditingProjId(null)
                    }}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      fontSize: '12px', color: '#ccc', fontFamily: 'inherit',
                      padding: 0, letterSpacing: '0.02em',
                    }}
                  />
                ) : (
                  <span style={{
                    flex: 1, fontSize: '12px', lineHeight: 1.4,
                    color: isActive ? '#ccc' : '#777',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </span>
                )}
              </div>
            )
          })}
          <div style={{ height: '1px', background: '#1e1e1e' }} />
          <button
            onClick={() => { createProject() }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'none', border: 'none', padding: '8px 14px',
              cursor: 'pointer', fontSize: '11px', color: '#444',
              fontFamily: 'inherit', letterSpacing: '0.02em',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#888')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
          >+ New workspace</button>
        </div>
      )}

      {/* Per-project context menu */}
      {menuProjId && menuPos && (() => {
        const proj = projects.find(p => p.id === menuProjId)
        if (!proj) return null
        return (
          <div
            id="proj-ctx-menu"
            style={{
              position: 'fixed', left: menuPos.left, top: menuPos.top,
              background: '#0d0d0d', border: '1px solid #1a1a1a',
              borderRadius: '4px', zIndex: 300, minWidth: '130px',
              overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            <button
              onClick={() => { setEditingProjId(proj.id); setProjNameInput(proj.name); setMenuProjId(null); setMenuPos(null) }}
              style={ROW_STYLE}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >Rename</button>
            <div style={{ height: '1px', background: '#1a1a1a' }} />
            {projects.length === 1 ? (
              <div style={{ padding: '9px 14px', fontSize: '11px', color: '#555', userSelect: 'none' }}>
                Can't delete only workspace
              </div>
            ) : (
              <button
                onClick={() => {
                  if (confirmDeleteId === proj.id) {
                    deleteProject(proj.id); setConfirmDeleteId(null); setMenuProjId(null); setMenuPos(null)
                  } else setConfirmDeleteId(proj.id)
                }}
                style={{ ...ROW_STYLE, color: confirmDeleteId === proj.id ? '#e55' : '#c55' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {confirmDeleteId === proj.id ? 'Confirm?' : 'Delete'}
              </button>
            )}
          </div>
        )
      })()}

      {!clockOpen && (
        <>
          {/* Add file */}
          <div
            onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true) } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false)
              const valid = Array.from(e.dataTransfer.files).filter(f =>
                f.type === 'application/pdf' || f.name.endsWith('.pdf') ||
                f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(f.name))
              if (valid.length) handleUpload(valid)
            }}
            onClick={() => fileRef.current?.click()}
            onMouseEnter={() => setAddHover(true)}
            onMouseLeave={() => setAddHover(false)}
            style={{ ...shell, background: dragOver ? '#141414' : addHover ? '#111' : '#0d0d0d', borderColor: dragOver ? '#333' : addHover ? '#252525' : '#1a1a1a', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '11px', color: '#777', letterSpacing: '0.04em', flex: 1 }}>
              {dragOver ? 'Drop to add file' : 'Add file'}
            </span>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif" multiple style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) { handleUpload(e.target.files); e.target.value = '' } }}
          />
          {addingUrl ? (
            <div style={{
              margin: '6px 10px 0', padding: '11px 14px',
              background: '#0d0d0d', border: '1px solid #333', borderRadius: '4px',
              display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            }}>
              <input
                ref={urlInputRef}
                autoFocus
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="Paste a URL..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const raw = urlInput.trim()
                    if (!raw) { setAddingUrl(false); setUrlInput(''); return }
                    const url = raw.startsWith('http') ? raw : `https://${raw}`
                    addUrl(url)
                    setAddingUrl(false); setUrlInput('')
                  }
                  if (e.key === 'Escape') { setAddingUrl(false); setUrlInput('') }
                }}
                onBlur={() => { if (!urlInput.trim()) { setAddingUrl(false); setUrlInput('') } }}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: '11px', color: '#bbb', fontFamily: 'inherit', letterSpacing: '0.02em',
                }}
              />
            </div>
          ) : (
            <UrlBtn onClick={() => { setAddingUrl(true); setTimeout(() => urlInputRef.current?.focus(), 0) }} />
          )}
          {dupMsg && (
            <div style={{ margin: '6px 10px 0', fontSize: '11px', color: '#666', letterSpacing: '0.02em', padding: '0 2px' }}>
              Already added.
            </div>
          )}

          {/* Source list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, marginTop: '8px', borderTop: '1px solid #1a1a1a' }}>
            {sources.length > 0 && (
              <div style={{ ...shell, cursor: 'text', padding: '11px 14px' }} onClick={() => filterRef.current?.focus()}>
                <input
                  ref={filterRef} className="sp-input"
                  value={filterInput} onChange={e => setFilterInput(e.target.value)}
                  placeholder="Filter..."
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', fontFamily: 'inherit', letterSpacing: '0.02em', color: '#555' }}
                />
                {filterInput && (
                  <button onClick={e => { e.stopPropagation(); setFilterInput(''); setFilter('') }}
                    style={{ background: 'none', border: 'none', padding: '0 0 0 6px', cursor: 'pointer', color: '#666', fontSize: '13px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                  >×</button>
                )}
              </div>
            )}
            <div
              ref={listRef}
              style={{ flex: 1, overflowY: 'auto', marginTop: sources.length > 0 ? '4px' : '0' }}
              onDragOver={handleListDragOver}
              onDrop={handleListDrop}
            >
              {sources.length === 0
                ? (
                  <div style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#555', lineHeight: 1.7 }}>Drop a file or paste a URL to begin.</span>
                  </div>
                )
                : visible.length === 0
                  ? <div style={{ padding: '10px 16px', fontSize: '12px', color: '#555' }}>No results</div>
                  : visible.map(src => (
                      <div key={src.id} style={{ opacity: src.id === draggingId ? 0.35 : 1, transition: 'opacity 0.1s' }}>
                        <SourceItem
                          src={src}
                          onDragStart={handleItemDragStart}
                          onDragEnd={handleItemDragEnd}
                        />
                      </div>
                    ))
              }
            </div>
          </div>
        </>
      )}

      <Clock open={clockOpen} onToggle={() => setClockOpen(o => !o)} />

    </div>
  )
}

function Clock({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hhmm = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const ss   = now.toLocaleTimeString([], { second: '2-digit' }).slice(-2)
  const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  if (open) {
    return (
      <div style={{ flex: 1, minHeight: 0, borderTop: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px' }}>
          <ClockIconBtn onClick={onToggle} title="Collapse"><ClockCollapseIcon /></ClockIconBtn>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontSize: '32px', color: '#555', letterSpacing: '0.06em', fontWeight: 300 }}>{hhmm}</span>
            <span style={{ fontSize: '14px', color: '#333', letterSpacing: '0.04em' }}>{ss}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#383838', letterSpacing: '0.1em' }}>{date.toUpperCase()}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid #1a1a1a', flexShrink: 0, display: 'flex', alignItems: 'center', height: '28px', padding: '0 8px 0 14px', gap: '4px' }}>
      <span style={{ flex: 1, fontSize: '10px', letterSpacing: '0.04em', userSelect: 'none', color: '#888', fontVariantNumeric: 'tabular-nums' }}>
        {hhmm}
      </span>
      <ClockIconBtn onClick={onToggle} title="Expand"><ClockExpandIcon /></ClockIconBtn>
    </div>
  )
}

function ClockIconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 0, color: hov ? '#bbb' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', flexShrink: 0 }}
    >{children}</button>
  )
}
function ClockExpandIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4V1H4" /><path d="M7 1H10V4" /><path d="M10 7V10H7" /><path d="M4 10H1V7" /></svg>
}
function ClockCollapseIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 1V4H1" /><path d="M10 4H7V1" /><path d="M7 10V7H10" /><path d="M1 7H4V10" /></svg>
}

function UrlBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        margin: '6px 10px 0', padding: '11px 14px',
        background: hov ? '#111' : '#0d0d0d',
        border: `1px solid ${hov ? '#252525' : '#1a1a1a'}`,
        borderRadius: '4px', display: 'flex', alignItems: 'center',
        cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s', flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '11px', color: '#777', letterSpacing: '0.04em', flex: 1 }}>Add URL</span>
    </div>
  )
}

