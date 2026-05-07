'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'

type CtxMenu = { x: number; y: number }

export default function DraftPanel({ width }: { width: number }) {
  const { activeProject, activeId, updateProject } = useApp()

  // Step 4 onboarding: brief confirmation after first Insert
  const [ob4, setOb4] = useState<'idle' | 'in' | 'out'>('idle')
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('proof-ob') === 'd') return
    function onInsert() {
      setOb4('in')
      const t1 = setTimeout(() => setOb4('out'), 3200)
      const t2 = setTimeout(() => {
        setOb4('idle')
        if (typeof window !== 'undefined') localStorage.setItem('proof-ob', 'd')
      }, 4000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    window.addEventListener('proof-send-to-draft', onInsert, { once: true })
    return () => window.removeEventListener('proof-send-to-draft', onInsert)
  }, [])

  const [localTitle, setLocalTitle] = useState(activeProject?.draftTitle ?? '')
  const [localDraft, setLocalDraft] = useState(activeProject?.draft ?? '')
  const [ctxMenu, setCtxMenu]       = useState<CtxMenu | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [dropTarget, setDropTarget] = useState(false)
  const [editMode, setEditMode]     = useState(
    !!(activeProject?.draftTitle?.trim() || activeProject?.draft?.trim())
  )
  const activeIdRef   = useRef(activeId)
  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  const localDraftRef = useRef(localDraft)
  useEffect(() => { localDraftRef.current = localDraft }, [localDraft])
  const editModeRef   = useRef(editMode)
  useEffect(() => { editModeRef.current = editMode }, [editMode])
  const draftTitleRef = useRef<HTMLInputElement>(null)
  const textareaRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const t = activeProject?.draftTitle ?? ''
    const d = activeProject?.draft ?? ''
    setLocalTitle(t)
    setLocalDraft(d)
    setEditMode(!!(t.trim() || d.trim()))
  }, [activeProject?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateProjectRef = useRef(updateProject)
  useEffect(() => { updateProjectRef.current = updateProject }, [updateProject])

  // Focus management: when edit mode first opens via an insertion we want
  // the cursor placed at the end of the inserted text automatically.
  const [pendingFocus, setPendingFocus] = useState(false)
  useEffect(() => {
    if (!pendingFocus || !editMode || !textareaRef.current) return
    const el = textareaRef.current
    el.focus()
    el.selectionStart = el.selectionEnd = el.value.length
    setPendingFocus(false)
  }, [pendingFocus, editMode])

  // Listen for insert events dispatched by ClipCard
  useEffect(() => {
    function handler(e: Event) {
      const text = (e as CustomEvent<string>).detail
      if (!text || !activeIdRef.current) return

      // First-ever insert: enter edit mode and focus textarea after render
      if (!editModeRef.current) {
        setEditMode(true)
        setLocalDraft(text)
        updateProjectRef.current(activeIdRef.current, { draft: text })
        setPendingFocus(true)
        return
      }

      const el   = textareaRef.current
      const prev = localDraftRef.current
      const pos  = el?.selectionStart ?? prev.length
      const before = prev.slice(0, pos)
      const after  = prev.slice(pos)

      // Ensure the clip lands as its own paragraph — clean double-newline on each side
      const prePad  = !before         ? ''
        : before.endsWith('\n\n')     ? ''
        : before.endsWith('\n')       ? '\n'
        : '\n\n'
      const postPad = !after          ? ''
        : after.startsWith('\n\n')    ? ''
        : after.startsWith('\n')      ? '\n'
        : '\n\n'

      const next = before + prePad + text + postPad + after
      setLocalDraft(next)
      updateProjectRef.current(activeIdRef.current, { draft: next })
      requestAnimationFrame(() => {
        if (!el) return
        el.focus()
        el.selectionStart = el.selectionEnd = pos + prePad.length + text.length
      })
    }
    window.addEventListener('proof-send-to-draft', handler)
    return () => window.removeEventListener('proof-send-to-draft', handler)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (activeIdRef.current) updateProjectRef.current(activeIdRef.current, { draft: localDraft })
    }, 800)
    return () => clearTimeout(t)
  }, [localDraft])

  // Return to welcome guide when all content is cleared
  useEffect(() => {
    if (!localTitle.trim() && !localDraft.trim()) setEditMode(false)
  }, [localTitle, localDraft])

  useEffect(() => {
    if (activeIdRef.current) updateProjectRef.current(activeIdRef.current, { draftTitle: localTitle })
  }, [localTitle])

  const hasDraft   = editMode
  const hasContent = !!(localTitle.trim() || localDraft.trim())

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!hasDraft && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
        if (tag !== 'input' && tag !== 'textarea') { e.preventDefault(); handleNewDraft() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasDraft, activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const wordCount = localDraft.split(/\s+/).filter(Boolean).length

  function handleNewDraft() {
    setEditMode(true)
    requestAnimationFrame(() => draftTitleRef.current?.focus())
  }

  function handleDiscard() {
    if (!activeId) return
    setLocalTitle(''); setLocalDraft('')
    setEditMode(false)
    updateProject(activeId, { draft: '', draftTitle: '' })
  }

  function handleExport(fmt: 'txt' | 'md') {
    const title   = localTitle.trim() || 'draft'
    const slug    = title.replace(/\s+/g, '-').toLowerCase()
    const content = fmt === 'md'
      ? `# ${title}\n\n${localDraft}`
      : `${title}\n${'—'.repeat(title.length)}\n\n${localDraft}`
    const blob = new Blob([content], { type: 'text/plain' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `${slug}.${fmt}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function handleHighlightDragOver(e: React.DragEvent) {
    const types = e.dataTransfer.types
    if (!types.includes('application/x-proof-highlight') && !types.includes('text/plain')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDropTarget(true)
  }

  function handleHighlightDrop(e: React.DragEvent) {
    e.preventDefault()
    setDropTarget(false)
    const text = e.dataTransfer.getData('application/x-proof-highlight')
      || e.dataTransfer.getData('text/plain')
    if (!text) return

    if (!activeId) return

    // Auto-enter edit mode if not already editing
    if (!hasDraft) {
      setEditMode(true)
      setLocalDraft(text)
      updateProject(activeId, { draft: text })
      return
    }

    const el = textareaRef.current
    const pos    = el ? (el.selectionStart ?? localDraft.length) : localDraft.length
    const before = localDraft.slice(0, pos)
    const after  = localDraft.slice(pos)
    const prePad  = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
    const postPad = !after  ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
    const next   = before + prePad + text + postPad + after
    setLocalDraft(next)
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.selectionStart = el.selectionEnd = pos + prePad.length + text.length
    })
  }

  function handleTab(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el    = e.currentTarget
    const start = el.selectionStart
    const end   = el.selectionEnd
    const next  = localDraft.slice(0, start) + '    ' + localDraft.slice(end)
    setLocalDraft(next)
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4 })
  }

  const menuBtn: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'none', border: 'none', padding: '9px 14px',
    cursor: 'pointer', fontSize: '12px', color: '#777',
    letterSpacing: '0.04em', fontFamily: 'inherit',
  }

  const menuBtnRef = useRef<HTMLButtonElement>(null)

  function openCtxMenu() {
    if (!menuBtnRef.current) return
    setConfirmDiscard(false)
    const rect = menuBtnRef.current.getBoundingClientRect()
    setCtxMenu({ x: window.innerWidth - rect.right, y: rect.bottom + 4 })
  }

  return (
    <div
      style={{ width, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onDragOver={handleHighlightDragOver}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(false) }}
      onDrop={handleHighlightDrop}
    >
      {/* Header */}
      <div style={{
        padding: '0 20px', height: '40px', flexShrink: 0,
        borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: '12px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase',
        background: dropTarget ? '#0f0f0f' : 'transparent', transition: 'background 0.15s',
      }}>
        <span style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {dropTarget ? 'Drop to insert' : 'Draft'}
        </span>
        {hasContent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '8px' }}>
            <span style={{ fontSize: '11px', color: '#777', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              {wordCount}w
            </span>
            <button
              ref={menuBtnRef}
              onClick={openCtxMenu}
              style={{
                background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', outline: 'none',
                fontSize: '14px', color: '#777', letterSpacing: '0.1em', fontFamily: 'inherit', lineHeight: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
              onMouseLeave={e => (e.currentTarget.style.color = '#777')}
              title="Options"
            >
              ···
            </button>
          </div>
        )}
      </div>

      {/* Step 4 onboarding message */}
      {ob4 !== 'idle' && (
        <div style={{
          padding: '0 20px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          borderBottom: '1px solid #1a1a1a',
          fontSize: '11px',
          color: '#444',
          letterSpacing: '0.05em',
          opacity: ob4 === 'out' ? 0 : 1,
          transition: 'opacity 0.7s',
        }}>
          Your draft grows as you read.
        </div>
      )}

      {/* Body */}
      {!hasDraft ? (
        <div style={{ flex: 1, padding: '40px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <span style={{ fontSize: '12px', color: '#2a2a2a', lineHeight: 1.7 }}>
            Insert a clip from the left, or start writing.
          </span>
          <button
            onClick={handleNewDraft}
            style={{
              alignSelf: 'flex-start',
              background: 'none', border: '1px solid #1a1a1a', borderRadius: '4px',
              padding: '7px 18px', cursor: 'pointer', fontSize: '11px', color: '#444',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit',
              outline: 'none', transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#444' }}
          >
            New draft
          </button>
        </div>
      ) : (
        <>
          {/* Title */}
          <div style={{ padding: '24px 28px 0', flexShrink: 0, borderBottom: '1px solid #1a1a1a' }}>
            <input
              ref={draftTitleRef}
              value={localTitle}
              onChange={e => setLocalTitle(e.target.value)}
              placeholder="Untitled"
              className="draft-title"
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: '17px', fontWeight: 500, color: '#ccc',
                fontFamily: 'inherit', padding: '0 0 18px 0', boxSizing: 'border-box',
                letterSpacing: '-0.01em',
              }}
            />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="draft-body"
            value={localDraft}
            onChange={e => setLocalDraft(e.target.value)}
            onKeyDown={handleTab}
            placeholder="Start writing..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#ccc',
              fontSize: '14px', lineHeight: 2.0, padding: '22px 28px',
              resize: 'none', fontFamily: 'inherit', overflowY: 'auto',
              WebkitTextFillColor: 'inherit', opacity: 1,
            }}
          />
        </>
      )}

      {/* Options menu */}
      {ctxMenu && (
        <>
          <div
            onClick={() => { setCtxMenu(null); setConfirmDiscard(false) }}
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          />
          <div style={{
            position: 'fixed', right: ctxMenu.x, top: ctxMenu.y,
            background: '#0d0d0d', border: '1px solid #1a1a1a',
            borderRadius: '4px', zIndex: 200, minWidth: '140px',
            overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            {localDraft.trim() && (
              <>
                <button
                  onClick={() => { handleExport('txt'); setCtxMenu(null) }}
                  style={menuBtn}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  Save as .txt
                </button>
                <button
                  onClick={() => { handleExport('md'); setCtxMenu(null) }}
                  style={menuBtn}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  Save as .md
                </button>
                <div style={{ height: '1px', background: '#1a1a1a' }} />
              </>
            )}
            <button
              onClick={() => {
                if (confirmDiscard) { handleDiscard(); setCtxMenu(null) }
                else setConfirmDiscard(true)
              }}
              style={{ ...menuBtn, color: confirmDiscard ? '#e55' : '#c55' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {confirmDiscard ? 'Clear draft?' : 'Clear draft'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
