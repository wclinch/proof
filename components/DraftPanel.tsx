'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'

const MENU_BTN: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'none', border: 'none', padding: '9px 14px',
  cursor: 'pointer', fontSize: '12px', color: '#777',
  letterSpacing: '0.04em', fontFamily: 'inherit',
}

export default function DraftPanel() {
  const { selectedSource, activeId, activeProject, patchSource, updateProject } = useApp()

  const [text, setText]                 = useState('')
  const [ctxMenu, setCtxMenu]           = useState<{ x: number; y: number } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [notesOpen, setNotesOpen]       = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setText(selectedSource?.draft ?? '')
  }, [selectedSource?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(val: string) {
    setText(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (activeId && selectedSource) patchSource(activeId, selectedSource.id, { draft: val })
    }, 400)
  }

  function handleExport(fmt: 'txt' | 'md') {
    const name = selectedSource?.label ?? selectedSource?.raw ?? 'draft'
    const slug = name.replace(/\.pdf$/i, '').replace(/\s+/g, '-').toLowerCase()
    const blob = new Blob([text.trim()], { type: 'text/plain' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `${slug}.${fmt}`
    a.click()
    URL.revokeObjectURL(a.href)
    setCtxMenu(null)
  }

  const wordCount  = text.split(/\s+/).filter(Boolean).length
  const hasContent = text.trim().length > 0

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '0 8px 0 14px', height: '28px', flexShrink: 0,
        borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '10px', color: '#888', letterSpacing: '0.04em' }}>
          Draft
        </span>

        {hasContent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: '#666' }}>{wordCount}w</span>
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
                fontSize: '14px', color: '#666', fontFamily: 'inherit', outline: 'none',
                letterSpacing: '0.1em', lineHeight: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#bbb')}
              onMouseLeave={e => (e.currentTarget.style.color = '#666')}
            >···</button>
          </div>
        )}
      </div>

      {/* Writing surface */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 60px' }}>
        <textarea
          className="prose-area"
          value={text}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault()
              const el    = e.currentTarget
              const start = el.selectionStart
              const end   = el.selectionEnd
              const next  = text.substring(0, start) + '\t' + text.substring(end)
              handleChange(next)
              requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 1 })
            }
          }}
          placeholder={selectedSource ? 'Begin writing.' : 'Start writing here, available anytime...'}
          style={{
            width: '100%', minHeight: '100%',
            background: 'transparent', border: 'none', outline: 'none',
            resize: 'none',
            fontSize: '15px', lineHeight: 1.9, color: '#ccc',
            fontFamily: 'inherit',
            padding: 0,
            tabSize: 4,
          }}
        />
      </div>

      {/* Notes — bottom of draft panel */}
      <div style={{
        borderTop: '1px solid #1a1a1a', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        ...(notesOpen ? { flex: '0 0 38%', minHeight: 0 } : {}),
      }}>
        <div style={{
          height: '28px', flexShrink: 0,
          display: 'flex', alignItems: 'center',
          padding: '0 8px 0 14px', gap: '4px',
          ...(notesOpen ? { borderBottom: '1px solid #1a1a1a' } : {}),
        }}>
          <span style={{ flex: 1, fontSize: '10px', letterSpacing: '0.04em', userSelect: 'none', color: '#888' }}>
            {!notesOpen && (activeProject?.scratchpad ?? '').trim()
              ? (activeProject!.scratchpad!).trimStart().split('\n')[0].slice(0, 32) + ((activeProject!.scratchpad!).length > 32 ? '…' : '')
              : 'Notes'}
          </span>
          <NoteIconBtn onClick={() => setNotesOpen(o => !o)} title={notesOpen ? 'Collapse' : 'Expand'}>
            {notesOpen ? <NoteCollapseIcon /> : <NoteExpandIcon />}
          </NoteIconBtn>
        </div>
        {notesOpen && (
          <textarea
            value={activeProject?.scratchpad ?? ''}
            onChange={e => { if (activeId) updateProject(activeId, { scratchpad: e.target.value }) }}
            placeholder="Notes..."
            style={{
              flex: 1, width: '100%', boxSizing: 'border-box',
              background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              padding: '12px 24px',
              fontSize: '13px', color: '#ccc', fontFamily: 'inherit',
              lineHeight: 1.7, caretColor: '#888',
            }}
          />
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
            <button onClick={() => handleExport('txt')} style={MENU_BTN}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >Save as .txt</button>
            <button onClick={() => handleExport('md')} style={MENU_BTN}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >Save as .md</button>
            <div style={{ height: '1px', background: '#1a1a1a' }} />
            <button
              onClick={() => {
                if (confirmClear) { handleChange(''); setCtxMenu(null) }
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

function NoteIconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 0, color: hov ? '#bbb' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', flexShrink: 0 }}
    >{children}</button>
  )
}
function NoteExpandIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4V1H4" /><path d="M7 1H10V4" /><path d="M10 7V10H7" /><path d="M4 10H1V7" /></svg>
}
function NoteCollapseIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 1V4H1" /><path d="M10 4H7V1" /><path d="M7 10V7H10" /><path d="M1 7H4V10" /></svg>
}
