'use client'
import { useState, useRef, useEffect } from 'react'
import type { Clip, DocContent } from '@/lib/types'

function resolveClip(clip: Clip, content: DocContent) {
  const idSet = new Set(clip.sentenceIds)
  const texts: string[] = []
  const pages = new Set<number>()
  for (const block of content.blocks) {
    for (const s of block.sentences) {
      if (!idSet.has(s.i)) continue
      texts.push(s.text)
      if (s.page) pages.add(s.page)
    }
  }
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const pageLabel = sorted.length === 0 ? ''
    : sorted.length === 1 ? `p. ${sorted[0]}`
    : `p. ${sorted[0]}–${sorted[sorted.length - 1]}`
  return { resolvedText: texts.join(' '), pageLabel }
}

export default function ClipCard({
  clip, content, sourceLabel, onDelete, onInsert, onUpdate, onDragStart, onDragEnd, isDragging,
}: {
  clip: Clip
  content: DocContent
  sourceLabel?: string
  onDelete: () => void
  onInsert: (text: string, meta?: { pageLabel?: string; sourceLabel?: string }) => void
  onUpdate: (editedText: string) => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  isDragging: boolean
}) {
  const { resolvedText, pageLabel } = resolveClip(clip, content)
  const displayText = clip.editedText ?? resolvedText

  const [hov, setHov]             = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [editing, setEditing]     = useState(false)
  const [val, setVal]             = useState(displayText)
  const [menu, setMenu]           = useState<{ x: number; y: number } | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const taRef                     = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && taRef.current) {
      const el = taRef.current
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
      el.focus()
      el.selectionStart = el.selectionEnd = el.value.length
    }
  }, [editing])

  function commitEdit() {
    const trimmed = val.trim()
    if (trimmed && trimmed !== resolvedText) onUpdate(trimmed)
    else if (!trimmed) onUpdate(resolvedText) // revert if cleared
    setEditing(false)
  }

  return (
    <>
      <div
        draggable
        onDragStart={e => {
          // Set all types so this can drop on Draft (creates fragment) or
          // within Saved (reorders clip)
          e.dataTransfer.setData('application/x-proof-highlight', displayText)
          e.dataTransfer.setData('text/plain', displayText)
          e.dataTransfer.setData('application/x-proof-meta', JSON.stringify({ pageLabel, sourceLabel }))
          e.dataTransfer.setData('application/x-proof-clip-id', clip.id)
          e.dataTransfer.effectAllowed = 'copy'
          onDragStart(e)
        }}
        onDragEnd={onDragEnd}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onContextMenu={e => { e.preventDefault(); setConfirmDel(false); setMenu({ x: e.clientX, y: e.clientY }) }}
        style={{
          display: 'flex', gap: '8px',
          padding: '10px 12px',
          borderBottom: '1px solid #0f0f0f',
          opacity: isDragging ? 0.25 : 1,
          transition: 'background 0.1s, opacity 0.1s',
          background: hov ? '#111' : 'transparent',
          cursor: 'grab',
        }}
      >
        <div style={{ flexShrink: 0, paddingTop: '2px', userSelect: 'none' }}>
          <span style={{ fontSize: '10px', color: hov ? '#777' : '#444', letterSpacing: '0.15em', transition: 'color 0.15s' }}>⠿</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Editable text */}
          {editing ? (
            <textarea
              ref={taRef}
              value={val}
              onChange={e => {
                setVal(e.target.value)
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
              }}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Escape') { setVal(displayText); setEditing(false) }
              }}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                resize: 'none', overflow: 'hidden',
                fontSize: '11px', lineHeight: 1.65, color: '#bbb',
                fontFamily: 'inherit', padding: 0,
              }}
            />
          ) : (
            <div
              onClick={() => { setVal(displayText); setEditing(true) }}
              style={{
                fontSize: '11px', lineHeight: 1.65, color: hov ? '#bbb' : '#999',
                cursor: 'text',
                overflow: expanded ? 'visible' : 'hidden',
                display: expanded ? 'block' : '-webkit-box',
                WebkitLineClamp: expanded ? undefined : 3,
                WebkitBoxOrient: expanded ? undefined : 'vertical' as const,
              } as React.CSSProperties}
            >
              {displayText}
            </div>
          )}

          {/* Source footer */}
          {(pageLabel || sourceLabel) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', color: '#555', letterSpacing: '0.06em' }}>
              {pageLabel && <span>{pageLabel}</span>}
              {pageLabel && sourceLabel && <span style={{ color: '#333' }}>·</span>}
              {sourceLabel && <span style={{ wordBreak: 'break-word', minWidth: 0, flex: 1 }}>{sourceLabel}</span>}
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
            minWidth: '140px', overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            <button
              onClick={() => { if (confirmDel) { onDelete(); setMenu(null) } else setConfirmDel(true) }}
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
