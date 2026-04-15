'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import CitationsPanel from './CitationsPanel'

export default function DraftPanel({ width }: { width: number }) {
  const { activeProject, activeId, updateProject } = useApp()

  // Draft title: synced immediately (short, infrequent, needed by API calls)
  const [localTitle, setLocalTitle] = useState(activeProject?.draftTitle ?? '')

  // Draft body: local state with debounced sync — zero typing lag
  const [localDraft, setLocalDraft] = useState(activeProject?.draft ?? '')

  const [showExportMenu, setShowExportMenu] = useState(false)
  const draftTitleRef = useRef<HTMLInputElement>(null)

  // Reinitialize local state when active project switches
  useEffect(() => {
    setLocalTitle(activeProject?.draftTitle ?? '')
    setLocalDraft(activeProject?.draft ?? '')
  }, [activeProject?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced sync of draft body to context/localStorage (800ms)
  useEffect(() => {
    if (!activeId) return
    const t = setTimeout(() => {
      updateProject(activeId, { draft: localDraft })
    }, 800)
    return () => clearTimeout(t)
  }, [localDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  // Immediate sync of draft title
  useEffect(() => {
    if (!activeId) return
    updateProject(activeId, { draftTitle: localTitle })
  }, [localTitle]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasDraft = !!(activeProject?.draftCreated || localTitle || localDraft)
  const wordCount = localDraft.split(/\s+/).filter(Boolean).length

  function handleNewDraft() {
    if (!activeId) return
    updateProject(activeId, { draftCreated: true })
    requestAnimationFrame(() => draftTitleRef.current?.focus())
  }

  function handleDiscard() {
    if (!activeId) return
    setLocalTitle('')
    setLocalDraft('')
    updateProject(activeId, { draftCreated: false, draft: '', draftTitle: '' })
  }

  function handleExport(fmt: 'txt' | 'md') {
    const title = localTitle.trim() || 'draft'
    const slug  = title.replace(/\s+/g, '-').toLowerCase()
    const content = fmt === 'md'
      ? `# ${title}\n\n${localDraft}`
      : `${title}\n${'—'.repeat(title.length)}\n\n${localDraft}`
    const blob = new Blob([content], { type: 'text/plain' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `${slug}.${fmt}`
    a.click()
    URL.revokeObjectURL(a.href)
    setShowExportMenu(false)
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

  return (
    <div style={{ width, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '0 20px', height: '40px', flexShrink: 0,
        borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: '12px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        <span>Synthesis</span>
        {hasDraft && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.06em' }}>{wordCount} words</span>
            {localDraft.trim() && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowExportMenu(v => !v)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: '11px', color: '#333', letterSpacing: '0.06em',
                    textTransform: 'uppercase', fontFamily: 'inherit', outline: 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#666')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#333')}
                >
                  Export ↑
                </button>
                {showExportMenu && (
                  <div style={{
                    position: 'absolute', top: '24px', right: 0,
                    background: '#141414', border: '1px solid #2a2a2a',
                    borderRadius: '4px', overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)', minWidth: '100px', zIndex: 50,
                  }}>
                    {(['txt', 'md'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => handleExport(fmt)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          background: 'none', border: 'none', padding: '8px 14px',
                          cursor: 'pointer', fontSize: '11px', color: '#777',
                          letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        .{fmt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleDiscard}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
                fontSize: '11px', color: '#333', letterSpacing: '0.06em',
                textTransform: 'uppercase', fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#666')}
              onMouseLeave={e => (e.currentTarget.style.color = '#333')}
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {!hasDraft ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <button
            onClick={handleNewDraft}
            style={{
              background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '4px',
              padding: '9px 20px', cursor: 'pointer', fontSize: '12px', color: '#555',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit',
              outline: 'none', transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#999' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#555' }}
          >
            New
          </button>
          <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.04em' }}>nothing here yet</span>
        </div>
      ) : (
        <>
          {/* Title */}
          <div style={{ padding: '20px 28px 0', flexShrink: 0, borderBottom: '1px solid #111' }}>
            <input
              ref={draftTitleRef}
              value={localTitle}
              onChange={e => setLocalTitle(e.target.value)}
              placeholder="Untitled"
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: '18px', fontWeight: 500, color: '#aaa',
                fontFamily: 'inherit', padding: '0 0 16px 0', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Textarea */}
          <textarea
            value={localDraft}
            onChange={e => setLocalDraft(e.target.value)}
            disabled={!localTitle.trim()}
            onKeyDown={handleTab}
            placeholder={localTitle.trim() ? 'Start writing...' : 'Add a title first...'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: localTitle.trim() ? '#bbb' : '#2a2a2a',
              fontSize: '14px', lineHeight: 1.9, padding: '20px 28px',
              resize: 'none', fontFamily: 'inherit', overflowY: 'auto',
              cursor: localTitle.trim() ? 'text' : 'default',
              WebkitTextFillColor: 'inherit', opacity: 1,
            }}
          />

          {/* Citations tray */}
          <CitationsPanel />
        </>
      )}
    </div>
  )
}
