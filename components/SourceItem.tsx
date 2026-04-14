'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import type { QueuedSource } from '@/lib/types'

const DOT: Record<string, string> = {
  done:    '#2a6',
  error:   '#933',
  loading: '#555',
  queued:  '#2a2a2a',
}

// SourceContextMenu dispatches this event to trigger inline renaming
export interface RenameSourceDetail { srcId: string; currentLabel: string }

export default function SourceItem({ src }: { src: QueuedSource }) {
  const {
    activeId, selectedId, selectedIds, anchorId, sources,
    setSelectedId, setSelectedIds, setAnchorId, setContextMenu, patchSource,
  } = useApp()

  const [editing, setEditing]       = useState(false)
  const [labelInput, setLabelInput] = useState('')

  const isSelected  = selectedIds.has(src.id)
  const isPrimary   = selectedId === src.id
  const displayName = src.label || src.result?.title || src.raw

  // Listen for rename trigger dispatched by SourceContextMenu
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RenameSourceDetail>).detail
      if (detail.srcId === src.id) {
        setLabelInput(detail.currentLabel)
        setEditing(true)
      }
    }
    window.addEventListener('proof:rename-source', handler)
    return () => window.removeEventListener('proof:rename-source', handler)
  }, [src.id])

  function handleClick(e: React.MouseEvent) {
    if (e.shiftKey && anchorId) {
      const anchorIdx = sources.findIndex(s => s.id === anchorId)
      const clickIdx  = sources.findIndex(s => s.id === src.id)
      const [lo, hi]  = anchorIdx < clickIdx ? [anchorIdx, clickIdx] : [clickIdx, anchorIdx]
      setSelectedIds(new Set(sources.slice(lo, hi + 1).map(s => s.id)))
      setSelectedId(src.id)
    } else {
      setSelectedIds(new Set([src.id]))
      setSelectedId(src.id)
      setAnchorId(src.id)
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!selectedIds.has(src.id)) {
      setSelectedIds(new Set([src.id]))
      setSelectedId(src.id)
      setAnchorId(src.id)
    }
    setContextMenu({ srcId: src.id, x: e.clientX, y: e.clientY })
  }

  function commitLabel() {
    const val = labelInput.trim()
    if (activeId) patchSource(activeId, src.id, { label: val || undefined })
    setEditing(false)
  }

  return (
    <div
      draggable={src.status === 'done'}
      onDragStart={e => {
        e.dataTransfer.setData('proof/srcId', src.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{
        padding: '10px 16px',
        cursor: 'pointer',
        background: isSelected ? '#111' : 'transparent',
        borderLeft: `2px solid ${isPrimary ? '#333' : isSelected ? '#222' : 'transparent'}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '9px',
        transition: 'background 0.1s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#0d0d0d' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <span
        className={src.status === 'loading' ? 'dot-loading' : undefined}
        style={{
          width: '6px', height: '6px', borderRadius: '50%',
          flexShrink: 0, marginTop: '5px',
          background: DOT[src.status] ?? '#2a2a2a',
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
            onFocus={e => e.target.select()}
            onClick={e => e.stopPropagation()}
            onBlur={commitLabel}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Enter') commitLabel()
              if (e.key === 'Escape') setEditing(false)
            }}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              width: '100%', fontSize: '13px', color: '#ccc',
              fontFamily: 'inherit', padding: 0, height: '18px',
            }}
          />
        ) : (
          <div style={{
            fontSize: '13px', lineHeight: 1.4,
            color: src.status === 'done' ? '#ccc' : '#555',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayName}
          </div>
        )}
        {src.status === 'loading' && (
          <div style={{ fontSize: '11px', color: '#444', marginTop: '3px', letterSpacing: '0.04em' }}>
            analyzing...
          </div>
        )}
        {src.status === 'error' && (
          <div style={{ fontSize: '11px', color: '#733', marginTop: '3px', letterSpacing: '0.03em' }}>
            {src.error}
          </div>
        )}
      </div>
    </div>
  )
}
