'use client'
import { useState, useRef } from 'react'
import type { Clip, DocContent } from '@/lib/types'

function resolveSentences(clip: Clip, content: DocContent): string[] {
  const idSet = new Set(clip.sentenceIds)
  const out: string[] = []
  for (const block of content.blocks) {
    for (const s of block.sentences) {
      if (idSet.has(s.i)) out.push(s.text)
    }
  }
  return out
}

export default function ClipCard({
  clip,
  content,
  onDelete,
  onInsert,
}: {
  clip: Clip
  content: DocContent
  onDelete: () => void
  onInsert: (text: string) => void
}) {
  const [hov, setHov] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const selRef = useRef({ start: 0, end: 0 })
  const taRef  = useRef<HTMLTextAreaElement>(null)

  const sentences = resolveSentences(clip, content)
  const fullText  = sentences.join(' ')

  function handleInsert() {
    const { start, end } = selRef.current
    const selected = start !== end ? fullText.slice(start, end).trim() : ''
    onInsert(selected || fullText)
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirmDelete(false) }}
      style={{
        padding: '10px 12px',
        background: hov ? '#111' : 'transparent',
        borderBottom: '1px solid #0f0f0f',
        display: 'flex', flexDirection: 'column', gap: '8px',
        transition: 'background 0.1s',
      }}
    >
      <textarea
        ref={taRef}
        readOnly
        value={fullText}
        onSelect={e => {
          selRef.current = {
            start: e.currentTarget.selectionStart,
            end:   e.currentTarget.selectionEnd,
          }
        }}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'transparent', border: 'none', outline: 'none',
          resize: 'none', overflow: 'hidden',
          fontSize: '11px', color: hov ? '#888' : '#666',
          lineHeight: 1.6, fontFamily: 'inherit',
          padding: 0, margin: 0,
          height: `${sentences.length * 1.6 * 11 * 1.5}px`,
        }}
      />

      {hov && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={handleInsert}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: '9px', color: '#444', fontFamily: 'inherit',
              letterSpacing: '0.06em', textTransform: 'uppercase', outline: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
          >
            Insert
          </button>
          <button
            onClick={() => {
              if (confirmDelete) onDelete()
              else setConfirmDelete(true)
            }}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: '9px', fontFamily: 'inherit', outline: 'none',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: confirmDelete ? '#e55' : '#333',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = confirmDelete ? '#f77' : '#c55')}
            onMouseLeave={e => (e.currentTarget.style.color = confirmDelete ? '#e55' : '#333')}
          >
            {confirmDelete ? 'Remove?' : 'Remove'}
          </button>
        </div>
      )}
    </div>
  )
}
