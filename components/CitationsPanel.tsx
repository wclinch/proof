'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import {
  formatEntry, formatIntext, formatFullBibliography,
  STYLE_LABELS, type CitationStyle,
} from '@/lib/citations'
import CopyBtn from './ui/CopyBtn'

export default function CitationsPanel() {
  const { sources, activeProject, activeId, updateProject, addCitation, removeCitation } = useApp()

  const [dragOver, setDragOver]   = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  const [ctxMenu, setCtxMenu]     = useState<{ srcId: string; x: number; y: number } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [panelHeight, setPanelHeight] = useState(() => {
    if (typeof window === 'undefined') return 220
    return parseInt(localStorage.getItem('proof-ui-ledger-height') || '220', 10)
  })
  const [handleHovered, setHandleHovered] = useState(false)
  const panelHeightRef = useRef(panelHeight)

  function startHeightDrag(e: React.MouseEvent) {
    e.preventDefault()
    const startY = e.clientY
    const startH = panelHeightRef.current

    function onMove(ev: MouseEvent) {
      const h = Math.max(80, Math.min(600, startH - (ev.clientY - startY)))
      panelHeightRef.current = h
      setPanelHeight(h)
      localStorage.setItem('proof-ui-ledger-height', String(h))
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'row-resize'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const citationIds = activeProject?.citations ?? []
  const style: CitationStyle = activeProject?.citationStyle ?? 'mla'

  const cited = citationIds
    .map(id => sources.find(s => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s && s.status === 'done' && !!s.result)

  // Dismiss context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    const handler = () => { setCtxMenu(null); setConfirmId(null) }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [ctxMenu])

  function setStyle(s: CitationStyle) {
    if (activeId) updateProject(activeId, { citationStyle: s })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const srcId = e.dataTransfer.getData('proof/srcId')
    if (srcId) addCitation(srcId)
  }

  function copyAll() {
    navigator.clipboard.writeText(formatFullBibliography(cited, style)).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 1400)
    })
  }

  const STYLES: CitationStyle[] = ['mla', 'apa', 'chicago']

  const menuBtn: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'none', border: 'none', padding: '9px 14px',
    cursor: 'pointer', fontSize: '12px', color: '#777',
    letterSpacing: '0.04em', fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', height: panelHeight, overflow: 'hidden' }}>
      {/* Resize handle */}
      <div
        onMouseDown={startHeightDrag}
        onMouseEnter={() => setHandleHovered(true)}
        onMouseLeave={() => setHandleHovered(false)}
        style={{
          height: '4px', flexShrink: 0, cursor: 'row-resize',
          background: handleHovered ? '#2e2e2e' : '#1a1a1a',
          transition: 'background 0.15s',
        }}
      />
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        flex: 1,
        borderTop: `1px solid ${dragOver ? '#2a4a30' : 'transparent'}`,
        background: dragOver ? '#0d1a0f' : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Column headers + style picker — only when there are entries */}
      {cited.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center',
          height: '32px', flexShrink: 0,
          borderBottom: '1px solid #1a1a1a',
        }}>
          <div style={{
            flex: 1, minWidth: 0, padding: '0 12px 0 16px',
            display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              {STYLES.map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  style={{
                    background: 'none', border: 'none', padding: '1px 5px',
                    cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                    fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: style === s ? '#666' : '#2a2a2a',
                    borderBottom: style === s ? '1px solid #444' : '1px solid transparent',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { if (style !== s) e.currentTarget.style.color = '#444' }}
                  onMouseLeave={e => { if (style !== s) e.currentTarget.style.color = '#2a2a2a' }}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '1px', height: '100%', background: '#1a1a1a', flexShrink: 0 }} />

          <div style={{
            flex: 1, minWidth: 0, padding: '0 12px', overflow: 'hidden',
            fontSize: '10px', color: '#2a2a2a',
            letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500,
            whiteSpace: 'nowrap',
          }}>
            // Cite
          </div>
        </div>
      )}

      {/* Body */}
      {cited.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', color: dragOver ? '#3a6a40' : '#252525',
          letterSpacing: '0.05em', pointerEvents: 'none', transition: 'color 0.15s',
        }}>
          {dragOver ? 'Drop to add' : 'Drop sources to build your ledger'}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cited.map(src => (
            <div
              key={src.id}
              onContextMenu={e => {
                e.preventDefault()
                e.stopPropagation()
                setConfirmId(null)
                setCtxMenu({ srcId: src.id, x: e.clientX, y: e.clientY })
              }}
              style={{
                display: 'flex', alignItems: 'stretch',
                borderBottom: '1px solid #111', minHeight: '36px',
                cursor: 'default',
              }}
            >
              {/* Works cited column */}
              <div style={{
                flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start',
                gap: '4px', padding: '8px 6px 8px 16px', overflow: 'hidden',
              }}>
                <span style={{
                  flex: 1, fontSize: '11px', color: '#555',
                  lineHeight: 1.55, wordBreak: 'break-word',
                }}>
                  {formatEntry(src, style)}
                </span>
                <CopyBtn text={formatEntry(src, style)} />
              </div>

              <div style={{ width: '1px', background: '#1a1a1a', flexShrink: 0 }} />

              {/* In-text column */}
              <div style={{
                flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
                gap: '4px', padding: '8px 6px 8px 16px', overflow: 'hidden',
              }}>
                <span style={{ flex: 1, fontSize: '12px', color: '#555', letterSpacing: '0.02em' }}>
                  {formatIntext(src, style)}
                </span>
                <CopyBtn text={formatIntext(src, style)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {cited.length > 0 && (
        <div style={{
          height: '32px', flexShrink: 0, borderTop: '1px solid #111',
          display: 'flex', alignItems: 'center', padding: '0 16px',
        }}>
          <button
            onClick={copyAll}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: '10px', color: copiedAll ? '#4a8' : '#333',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'inherit', outline: 'none', transition: 'color 0.15s',
            }}
            onMouseEnter={e => { if (!copiedAll) e.currentTarget.style.color = '#666' }}
            onMouseLeave={e => { if (!copiedAll) e.currentTarget.style.color = '#333' }}
          >
            {copiedAll ? '✓ Copied' : `Copy Ledger (${STYLE_LABELS[style]})`}
          </button>
        </div>
      )}

      {/* Right-click context menu */}
      {ctxMenu && (() => {
        const src = cited.find(s => s.id === ctxMenu.srcId)
        if (!src) return null
        return (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', left: ctxMenu.x, top: ctxMenu.y,
              background: '#141414', border: '1px solid #2a2a2a',
              borderRadius: '4px', zIndex: 300, minWidth: '130px',
              overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            <button
              onClick={() => {
                if (confirmId === src.id) {
                  removeCitation(src.id)
                  setConfirmId(null)
                  setCtxMenu(null)
                } else {
                  setConfirmId(src.id)
                }
              }}
              style={{ ...menuBtn, color: '#c55' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {confirmId === src.id ? 'Confirm?' : 'Remove'}
            </button>
          </div>
        )
      })()}
    </div>
    </div>
  )
}
