'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import type { QueuedSource } from '@/lib/types'

const STATUS_DOT: Record<string, string> = {
  done:       '#666',
  error:      '#a55',
  extracting: '#888',
  queued:     '#555',
}

const TYPE_DOT: Record<string, string> = {
  pdf:   '#5c7eb8',
  image: '#5c9e6e',
  note:  '#b8935c',
  url:   '#5ca8a0',
}

export interface RenameSourceDetail { srcId: string; currentLabel: string }

export default function SourceItem({ src, onDragStart, onDragEnd }: {
  src: QueuedSource
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
}) {
  const {
    selectedIds, anchorId, allSources,
    setSelectedIds, setAnchorId, setContextMenu,
    patchSource,
  } = useApp()

  const [editing, setEditing]       = useState(false)
  const [labelInput, setLabelInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isSelected  = selectedIds.has(src.id)
  const displayName = src.label || src.raw
  const dotColor = src.status === 'done' ? (TYPE_DOT[src.fileType ?? ''] ?? '#555') : STATUS_DOT[src.status] ?? '#444'

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RenameSourceDetail>).detail
      if (detail.srcId === src.id) { setLabelInput(detail.currentLabel); setEditing(true) }
    }
    window.addEventListener('proof:rename-source', handler)
    return () => window.removeEventListener('proof:rename-source', handler)
  }, [src.id])

  function handleClick(e: React.MouseEvent) {
    if (e.shiftKey && anchorId) {
      const ai = allSources.findIndex(s => s.id === anchorId)
      const ci = allSources.findIndex(s => s.id === src.id)
      const [lo, hi] = ai < ci ? [ai, ci] : [ci, ai]
      setSelectedIds(new Set(allSources.slice(lo, hi + 1).map(s => s.id)))
    } else {
      setSelectedIds(new Set([src.id]))
      setAnchorId(src.id)
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!selectedIds.has(src.id)) {
      setSelectedIds(new Set([src.id]))
      setAnchorId(src.id)
    }
    setContextMenu({ srcId: src.id, x: e.clientX, y: e.clientY })
  }

  function commitLabel() {
    const val = labelInput.trim()
    patchSource('', src.id, { label: val || undefined })
    setEditing(false)
  }

  return (
    <div
      data-src-id={src.id}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('application/x-proof-source-id', src.id)
        e.dataTransfer.setData('application/x-proof-source-type', src.fileType ?? 'pdf')
        e.dataTransfer.effectAllowed = 'copyMove'
        onDragStart?.(src.id)
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{
        padding: '10px 16px',
        cursor: 'pointer',
        background: isSelected ? '#111' : 'transparent',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '9px',
        transition: 'background 0.1s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#0d0d0d' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        flexShrink: 0, marginTop: '5px',
        background: dotColor,
        transition: 'background 0.15s',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <textarea
            ref={textareaRef}
            autoFocus
            rows={1}
            value={labelInput}
            onChange={e => {
              setLabelInput(e.target.value)
              const el = e.target
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
            onFocus={e => {
              e.target.select()
              const el = e.target
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
            onClick={e => e.stopPropagation()}
            onBlur={commitLabel}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Enter') { e.preventDefault(); commitLabel() }
              if (e.key === 'Escape') setEditing(false)
            }}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              width: '100%', fontSize: '12px', color: '#ccc',
              fontFamily: 'inherit', padding: 0, margin: 0,
              lineHeight: 1.4, wordBreak: 'break-word', boxSizing: 'border-box',
              resize: 'none', overflow: 'hidden', display: 'block',
            }}
          />
        ) : (
          <div style={{ fontSize: '12px', lineHeight: 1.4, color: src.status === 'done' ? '#ccc' : '#777', wordBreak: 'break-word' }}>
            {displayName}
          </div>
        )}
        {src.status === 'error' && (
          <div style={{ fontSize: '11px', color: '#777', marginTop: '3px', letterSpacing: '0.03em' }}>
            {src.error}
          </div>
        )}
      </div>
    </div>
  )
}
