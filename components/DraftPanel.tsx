'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import type { Fragment } from '@/lib/types'
import { uid } from '@/lib/storage'

// ─── Fragment item ────────────────────────────────────────────────────────────

function FragmentItem({
  fragment, autoFocus,
  onUpdate, onProseUpdate, onRemove,
  onDragStart, onDragEnd,
  isDragging,
}: {
  fragment: Fragment
  autoFocus?: boolean
  onUpdate: (text: string) => void
  onProseUpdate: (prose: string) => void
  onRemove: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  isDragging: boolean
}) {
  // Old 'note' fragments have their user text in `text` — treat as prose, no source.
  // New 'extract' fragments have source in `text` and user writing in `prose`.
  const hasSource = fragment.type !== 'note' && !!fragment.text.trim()
  const initialProse = fragment.type === 'note' ? fragment.text : (fragment.prose || '')

  const [editingSource, setEditingSource] = useState(false)
  const [sourceVal, setSourceVal]         = useState(fragment.text)
  const [editingProse, setEditingProse]   = useState(autoFocus || (!hasSource && !initialProse))
  const [proseVal, setProseVal]           = useState(initialProse)
  const [menu, setMenu]                   = useState<{ x: number; y: number } | null>(null)
  const [confirmDel, setConfirmDel]       = useState(false)
  const sourceRef                         = useRef<HTMLTextAreaElement>(null)
  const proseRef                          = useRef<HTMLTextAreaElement>(null)

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    if (editingSource && sourceRef.current) { autoResize(sourceRef.current); sourceRef.current.focus() }
  }, [editingSource])

  useEffect(() => {
    if (editingProse && proseRef.current) { autoResize(proseRef.current); proseRef.current.focus() }
  }, [editingProse])

  function commitSource() {
    const t = sourceVal.trim()
    if (t) onUpdate(t)
    else onUpdate(fragment.text) // revert if cleared
    setEditingSource(false)
  }

  function commitProse() {
    const trimmed = proseVal.trim()
    if (!trimmed && !hasSource) {
      // Standalone fragment with no content — remove it
      onRemove()
    } else {
      if (fragment.type === 'note') onUpdate(trimmed || ' ')
      else onProseUpdate(trimmed)
    }
    setEditingProse(false)
  }

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onContextMenu={e => { e.preventDefault(); setConfirmDel(false); setMenu({ x: e.clientX, y: e.clientY }) }}
        style={{
          padding: '16px 0',
          opacity: isDragging ? 0.25 : 1, transition: 'opacity 0.1s',
        }}
      >
        <div style={{ minWidth: 0 }}>

          {/* Source excerpt — always editable, visually recedes */}
          {hasSource && (
            <>
              {editingSource ? (
                <textarea
                  ref={sourceRef}
                  value={sourceVal}
                  onChange={e => { setSourceVal(e.target.value); autoResize(e.currentTarget) }}
                  onBlur={commitSource}
                  onKeyDown={e => { if (e.key === 'Escape') { setSourceVal(fragment.text); setEditingSource(false) } }}
                  style={{
                    display: 'block', width: '100%', boxSizing: 'border-box',
                    background: 'transparent', border: 'none', outline: 'none',
                    resize: 'none', overflow: 'hidden',
                    fontSize: '14px', lineHeight: 1.75, color: '#888',
                    fontFamily: 'inherit', padding: '0 0 0 14px',
                    margin: 0,
                    borderLeft: '2px solid #222',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}
                />
              ) : (
                <div
                  onClick={() => { setSourceVal(fragment.text); setEditingSource(true) }}
                  style={{
                    fontSize: '14px', lineHeight: 1.75, color: '#777',
                    cursor: 'text', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    borderLeft: '2px solid #222', paddingLeft: '14px',
                  }}
                >
                  {fragment.text}
                </div>
              )}

              {(fragment.pageLabel || fragment.sourceLabel) && (
                <div style={{
                  marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '10px', color: '#555', letterSpacing: '0.04em', paddingLeft: '14px',
                }}>
                  {fragment.pageLabel && <span>{fragment.pageLabel}</span>}
                  {fragment.pageLabel && fragment.sourceLabel && <span style={{ color: '#333' }}>·</span>}
                  {fragment.sourceLabel && <span style={{ wordBreak: 'break-word' }}>{fragment.sourceLabel}</span>}
                </div>
              )}

              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #161616' }} />
            </>
          )}

          {/* Writing space — always present, always bright, always editable */}
          {editingProse ? (
            <textarea
              ref={proseRef}
              className="prose-area"
              value={proseVal}
              onChange={e => { setProseVal(e.target.value); autoResize(e.currentTarget) }}
              onBlur={commitProse}
              onKeyDown={e => { if (e.key === 'Escape') { setProseVal(initialProse); setEditingProse(false) } }}
              placeholder="Interpret, argue, connect..."
              style={{
                display: 'block', width: '100%', boxSizing: 'border-box',
                background: 'transparent', border: 'none', outline: 'none',
                resize: 'none', overflow: 'hidden',
                fontSize: '14px', lineHeight: 1.85, color: '#ddd',
                fontFamily: 'inherit', padding: 0, margin: 0,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}
            />
          ) : (
            <div
              onClick={() => { setProseVal(proseVal); setEditingProse(true) }}
              style={{
                fontSize: '14px', lineHeight: 1.85,
                color: proseVal.trim() ? '#ddd' : '#252525',
                fontStyle: proseVal.trim() ? 'normal' : 'italic',
                cursor: 'text', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}
            >
              {proseVal.trim() || 'Interpret, argue, connect...'}
            </div>
          )}
        </div>
      </div>

      {/* Right-click context menu */}
      {menu && (
        <>
          <div onClick={() => { setMenu(null); setConfirmDel(false) }}
            style={{ position: 'fixed', inset: 0, zIndex: 298 }} />
          <div style={{
            position: 'fixed', left: menu.x, top: menu.y, zIndex: 299,
            background: '#0f0f0f', border: '1px solid #222',
            minWidth: '130px', overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            <button
              onClick={() => {
                if (confirmDel) { onRemove(); setMenu(null) }
                else setConfirmDel(true)
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', padding: '9px 14px',
                cursor: 'pointer', fontSize: '12px',
                color: confirmDel ? '#e55' : '#c55',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {confirmDel ? 'Remove?' : 'Remove'}
            </button>
          </div>
        </>
      )}
    </>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionItem({
  fragment, autoFocus, onUpdate, onRemove, onDragStart, onDragEnd, isDragging,
}: {
  fragment: Fragment
  autoFocus?: boolean
  onUpdate: (text: string) => void
  onRemove: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  isDragging: boolean
}) {
  const [editing, setEditing] = useState(autoFocus || !fragment.text.trim())
  const [val, setVal]         = useState(fragment.text)
  const [menu, setMenu]       = useState<{ x: number; y: number } | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select() }
  }, [editing])

  function commit() {
    const t = val.trim()
    if (t) onUpdate(t)
    else onRemove()
    setEditing(false)
  }

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onContextMenu={e => { e.preventDefault(); setConfirmDel(false); setMenu({ x: e.clientX, y: e.clientY }) }}
        style={{
          paddingTop: '28px', paddingBottom: '10px',
          opacity: isDragging ? 0.25 : 1,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {editing ? (
            <input
              ref={inputRef}
              value={val}
              onChange={e => setVal(e.target.value)}
              onBlur={commit}
              onKeyDown={e => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') { setVal(fragment.text); setEditing(false) }
              }}
              placeholder="Section title..."
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
                color: '#888', fontFamily: 'inherit', padding: 0,
              }}
            />
          ) : (
            <div
              onClick={() => { setVal(fragment.text); setEditing(true) }}
              style={{
                fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
                color: '#777', cursor: 'text',
              }}
            >
              {fragment.text || 'Untitled section'}
            </div>
          )}
          <div style={{ marginTop: '8px', height: '1px', background: '#1a1a1a' }} />
        </div>
      </div>

      {menu && (
        <>
          <div onClick={() => { setMenu(null); setConfirmDel(false) }} style={{ position: 'fixed', inset: 0, zIndex: 298 }} />
          <div style={{
            position: 'fixed', left: menu.x, top: menu.y, zIndex: 299,
            background: '#0f0f0f', border: '1px solid #222', minWidth: '130px',
            overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            <button
              onClick={() => { if (confirmDel) { onRemove(); setMenu(null) } else setConfirmDel(true) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', padding: '9px 14px',
                cursor: 'pointer', fontSize: '12px',
                color: confirmDel ? '#e55' : '#c55', fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >{confirmDel ? 'Remove?' : 'Remove'}</button>
          </div>
        </>
      )}
    </>
  )
}

// ─── Trailing input ───────────────────────────────────────────────────────────

function TrailingInput({ onCommit }: { onCommit: (text: string) => void }) {
  const [val, setVal] = useState('')
  const taRef         = useRef<HTMLTextAreaElement>(null)

  return (
    <div style={{ padding: '16px 0 40px', paddingLeft: '0' }}>
      <textarea
        ref={taRef}
        className="prose-area"
        value={val}
        onChange={e => {
          setVal(e.target.value)
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = el.scrollHeight + 'px'
        }}
        onBlur={() => {
          const trimmed = val.trim()
          if (trimmed) { onCommit(trimmed); setVal('') }
        }}
        onKeyDown={e => { if (e.key === 'Escape') { setVal(''); if (taRef.current) taRef.current.blur() } }}
        placeholder="Interpret, argue, connect..."
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none',
          resize: 'none', overflow: 'hidden', minHeight: '28px',
          fontSize: '14px', lineHeight: 1.85, color: '#ddd',
          fontFamily: 'inherit', padding: 0,
        }}
      />
    </div>
  )
}

// ─── Drop / insert zone ───────────────────────────────────────────────────────

function DropZone({
  afterId, active,
  onDragEnter, onDragLeave,
  onDrop, onAddNote,
}: {
  afterId: string | null
  active: boolean
  onDragEnter: () => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, afterId: string | null) => void
  onAddNote: (afterId: string | null) => void
}) {
  return (
    <div
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; onDragEnter() }}
      onDragLeave={() => { onDragLeave() }}
      onDrop={e => { e.stopPropagation(); onDrop(e, afterId) }}
      style={{
        height: active ? '36px' : '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(255,255,255,0.03)' : 'transparent',
        transition: 'height 0.1s, background 0.1s',
      }}
    >
      {active && (
        <div style={{ width: '100%', height: '1px', background: '#444' }} />
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

const MENU_BTN: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'none', border: 'none', padding: '9px 14px',
  cursor: 'pointer', fontSize: '12px', color: '#777',
  letterSpacing: '0.04em', fontFamily: 'inherit',
}

export default function DraftPanel({ width }: { width: number }) {
  const {
    activeProject, activeId,
    addFragment, insertFragment, removeFragment, updateFragment,
    moveFragment, clearFragments, updateProject,
  } = useApp()

  const [dropTarget, setDropTarget]   = useState(false)
  const [activeZone, setActiveZone]   = useState<string | null>(null)
  const [draggingId, setDraggingId]   = useState<string | null>(null)
  const [newFragId, setNewFragId]     = useState<string | null>(null)
  const [newSectionId, setNewSectionId] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu]         = useState<{ x: number; y: number } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const addFragRef = useRef(addFragment)
  useEffect(() => { addFragRef.current = addFragment }, [addFragment])
  const activeIdRef = useRef(activeId)
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  const fragments  = activeProject?.fragments ?? []
  const wordCount  = fragments.reduce((n, f) => n + f.text.split(/\s+/).filter(Boolean).length, 0)

  // Migrate old draft text → note fragment
  useEffect(() => {
    if (!activeProject || !activeId) return
    if ((activeProject.fragments?.length ?? 0) > 0) return
    if (!activeProject.draft?.trim()) return
    addFragment({ id: uid(), type: 'note', text: activeProject.draft.trim(), createdAt: Date.now() })
    updateProject(activeId, { draft: '', draftTitle: '' })
  }, [activeProject?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for insert events from saved clips
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      const text   = typeof detail === 'string' ? detail : detail?.text
      if (!text || !activeIdRef.current) return
      const pageLabel   = typeof detail === 'object' ? detail?.pageLabel   : undefined
      const sourceLabel = typeof detail === 'object' ? detail?.sourceLabel : undefined
      const type: Fragment['type'] = (pageLabel || sourceLabel) ? 'extract' : 'note'
      addFragRef.current({ id: uid(), type, text, pageLabel, sourceLabel, createdAt: Date.now() })
    }
    window.addEventListener('proof-send-to-draft', handler)
    return () => window.removeEventListener('proof-send-to-draft', handler)
  }, [])

  function parseDrop(e: React.DragEvent): { fragId?: string; text?: string; pageLabel?: string; sourceLabel?: string } {
    const fragId = e.dataTransfer.getData('application/x-proof-fragment-id')
    if (fragId) return { fragId }
    const text = e.dataTransfer.getData('application/x-proof-highlight') || e.dataTransfer.getData('text/plain')
    if (!text) return {}
    let pageLabel = '', sourceLabel = ''
    try {
      const meta = JSON.parse(e.dataTransfer.getData('application/x-proof-meta') || '{}')
      pageLabel   = meta.pageLabel   || ''
      sourceLabel = meta.sourceLabel || ''
    } catch {}
    return { text, pageLabel, sourceLabel }
  }

  function handleDrop(e: React.DragEvent, afterId: string | null) {
    e.preventDefault()
    setDropTarget(false)
    setActiveZone(null)
    const { fragId, text, pageLabel, sourceLabel } = parseDrop(e)

    if (fragId) {
      moveFragment(fragId, afterId)
      setDraggingId(null)
      return
    }
    if (!text) return

    const type: Fragment['type'] = (pageLabel || sourceLabel) ? 'extract' : 'note'
    const frag: Fragment = {
      id: uid(), type, text,
      pageLabel: pageLabel || undefined,
      sourceLabel: sourceLabel || undefined,
      createdAt: Date.now(),
    }
    if (fragments.length === 0) {
      addFragment(frag)
    } else if (afterId === null) {
      insertFragment(frag, null)  // prepend — drop on top zone
    } else {
      insertFragment(frag, afterId)
    }
  }

  function addNote(afterId: string | null) {
    const id = uid()
    const frag: Fragment = { id, type: 'note', text: '', createdAt: Date.now() }
    if (afterId === null && fragments.length === 0) addFragment(frag)
    else insertFragment(frag, afterId ?? (fragments.length ? fragments[fragments.length - 1].id : null))
    setNewFragId(id)
  }

  function handleExport(fmt: 'txt' | 'md') {
    const lines: string[] = []
    for (const frag of fragments) {
      lines.push(frag.text)
      if (frag.pageLabel || frag.sourceLabel) {
        const src = [frag.pageLabel, frag.sourceLabel].filter(Boolean).join(', ')
        lines.push(fmt === 'md' ? `*(${src})*` : `[${src}]`)
      }
      lines.push('')
    }
    const name   = activeProject?.name || 'draft'
    const slug   = name.replace(/\s+/g, '-').toLowerCase()
    const blob   = new Blob([lines.join('\n').trim()], { type: 'text/plain' })
    const a      = document.createElement('a')
    a.href       = URL.createObjectURL(blob)
    a.download   = `${slug}.${fmt}`
    a.click()
    URL.revokeObjectURL(a.href)
    setCtxMenu(null)
  }

  const isDragTarget = (types: readonly string[]) =>
    types.includes('application/x-proof-highlight') ||
    types.includes('application/x-proof-fragment-id') ||
    types.includes('text/plain')

  return (
    <div
      style={{ width, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onDragOver={e => {
        if (!isDragTarget(e.dataTransfer.types)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setDropTarget(true)
      }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropTarget(false)
          setActiveZone(null)
        }
      }}
      onDrop={e => handleDrop(e, fragments.length ? fragments[fragments.length - 1].id : null)}
    >
      {/* Header */}
      <div style={{
        padding: '0 20px', height: '40px', flexShrink: 0,
        borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: dropTarget ? '#0f0f0f' : 'transparent', transition: 'background 0.15s',
      }}>
        <span style={{ fontSize: '10px', color: dropTarget ? '#aaa' : '#888', letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'color 0.15s' }}>
          {dropTarget ? 'Drop to add' : 'Draft'}
        </span>
        {(fragments.length > 0 || wordCount > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#555' }}>{wordCount}w</span>
            <button
              ref={menuBtnRef}
              onClick={() => {
                setConfirmClear(false)
                if (!menuBtnRef.current) return
                const r = menuBtnRef.current.getBoundingClientRect()
                setCtxMenu({ x: window.innerWidth - r.right, y: r.bottom + 4 })
              }}
              style={{
                background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer',
                fontSize: '14px', color: '#555', fontFamily: 'inherit', outline: 'none',
                letterSpacing: '0.1em', lineHeight: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#999')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >···</button>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {fragments.length === 0 ? (
          <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: 1.7 }}>
              Drag sentences here to begin synthesis.
            </p>
          </div>
        ) : (
          <>
            <DropZone
              afterId={null}
              active={activeZone === '__top__'}
              onDragEnter={() => setActiveZone('__top__')}
              onDragLeave={() => setActiveZone(null)}
              onDrop={handleDrop}
              onAddNote={addNote}
            />

            {fragments.map((frag, idx) => (
              <div key={frag.id}>
                {frag.type !== 'section' && idx > 0 && fragments[idx - 1].type !== 'section' && (
                  <div style={{ height: '1px', background: '#111' }} />
                )}
                {frag.type === 'section' ? (
                  <SectionItem
                    fragment={frag}
                    autoFocus={frag.id === newSectionId}
                    onUpdate={text => { updateFragment(frag.id, { text }); if (frag.id === newSectionId) setNewSectionId(null) }}
                    onRemove={() => { removeFragment(frag.id); if (frag.id === newSectionId) setNewSectionId(null) }}
                    isDragging={draggingId === frag.id}
                    onDragStart={e => { e.dataTransfer.setData('application/x-proof-fragment-id', frag.id); e.dataTransfer.effectAllowed = 'move'; setDraggingId(frag.id) }}
                    onDragEnd={() => setDraggingId(null)}
                  />
                ) : (
                  <FragmentItem
                    fragment={frag}
                    autoFocus={frag.id === newFragId}
                    onUpdate={text => { updateFragment(frag.id, { text }); if (frag.id === newFragId) setNewFragId(null) }}
                    onProseUpdate={prose => updateFragment(frag.id, { prose: prose || undefined })}
                    onRemove={() => { removeFragment(frag.id); if (frag.id === newFragId) setNewFragId(null) }}
                    isDragging={draggingId === frag.id}
                    onDragStart={e => { e.dataTransfer.setData('application/x-proof-fragment-id', frag.id); e.dataTransfer.effectAllowed = 'move'; setDraggingId(frag.id) }}
                    onDragEnd={() => setDraggingId(null)}
                  />
                )}
                <DropZone
                  afterId={frag.id}
                  active={activeZone === frag.id}
                  onDragEnter={() => setActiveZone(frag.id)}
                  onDragLeave={() => setActiveZone(null)}
                  onDrop={handleDrop}
                  onAddNote={addNote}
                />
              </div>
            ))}

            {/* Add section */}
            <button
              onClick={() => {
                const id = uid()
                addFragment({ id, type: 'section', text: '', createdAt: Date.now() })
                setNewSectionId(id)
              }}
              style={{
                display: 'block', marginBottom: '40px',
                background: 'none', border: 'none', padding: '2px 0',
                cursor: 'pointer', fontSize: '10px', color: '#333',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                fontFamily: 'inherit', outline: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#666')}
              onMouseLeave={e => (e.currentTarget.style.color = '#333')}
            >+ Section</button>

          </>
        )}
      </div>

      {/* Options menu */}
      {ctxMenu && (
        <>
          <div
            onClick={() => { setCtxMenu(null); setConfirmClear(false) }}
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          />
          <div style={{
            position: 'fixed', right: ctxMenu.x, top: ctxMenu.y,
            background: '#0d0d0d', border: '1px solid #1a1a1a',
            borderRadius: '4px', zIndex: 200, minWidth: '140px',
            overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            {fragments.length > 0 && (
              <>
                <button onClick={() => handleExport('txt')} style={MENU_BTN}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >Save as .txt</button>
                <button onClick={() => handleExport('md')} style={MENU_BTN}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >Save as .md</button>
                <div style={{ height: '1px', background: '#1a1a1a' }} />
              </>
            )}
            <button
              onClick={() => {
                if (confirmClear) { clearFragments(); setCtxMenu(null); setConfirmClear(false) }
                else setConfirmClear(true)
              }}
              style={{ ...MENU_BTN, color: confirmClear ? '#e55' : '#c55' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {confirmClear ? 'Clear all?' : 'Clear all'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
