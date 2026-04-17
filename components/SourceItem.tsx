'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import type { QueuedSource } from '@/lib/types'

const DOT: Record<string, string> = {
  done:    '#2a6',
  error:   '#777',
  loading: '#777',
  queued:  '#555',
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

  // Progress bar: React-controlled width so we can snap to 100% on completion
  const [barWidth, setBarWidth] = useState(0)
  const [showBar, setShowBar]   = useState(false)
  useEffect(() => {
    if (src.status !== 'loading') {
      if (showBar) {
        // Snap to 100%, then hide after transition
        setBarWidth(100)
        const t = setTimeout(() => setShowBar(false), 500)
        return () => clearTimeout(t)
      }
      return
    }
    setBarWidth(0)
    setShowBar(true)
    // Simulate progress: fast at start, slows near end
    const steps = [
      [400,  12], [1200, 30], [2500, 50],
      [4500, 65], [7000, 76], [11000, 83], [17000, 88],
    ] as [number, number][]
    const timers = steps.map(([delay, w]) => setTimeout(() => setBarWidth(w), delay))
    return () => timers.forEach(clearTimeout)
  }, [src.status]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    setLabelInput(displayName ?? '')
    setEditing(true)
  }

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      style={{
        padding: '10px 16px',
        cursor: 'pointer',
        background: isSelected ? '#111' : 'transparent',
        borderLeft: `2px solid ${isPrimary ? '#333' : isSelected ? '#1a1a1a' : 'transparent'}`,
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
            color: src.status === 'done' ? '#ccc' : '#777',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayName}
          </div>
        )}
        {showBar && (
          <div style={{ marginTop: '4px' }}>
            {src.status === 'loading' && (
              <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px' }}>
                analyzing...
              </div>
            )}
            <div style={{ width: '100%', height: '2px', background: '#1a1a1a', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: '#333', borderRadius: '1px',
                width: `${barWidth}%`,
                transition: 'width 0.6s ease-out',
              }} />
            </div>
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
