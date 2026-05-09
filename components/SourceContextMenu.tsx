'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { RenameSourceDetail } from './SourceItem'

const TYPE_DEFAULT: Record<string, string> = { pdf: '#5c7eb8', image: '#5c9e6e' }

const COLORS = [
  { value: '#b85c5c', label: 'Red'    },
  { value: '#b8845c', label: 'Orange' },
  { value: '#a8a85c', label: 'Yellow' },
  { value: '#5c9e6e', label: 'Green'  },
  { value: '#5c7eb8', label: 'Blue'   },
  { value: '#8b6fb8', label: 'Purple' },
  { value: '#888',    label: 'Gray'   },
]

export default function SourceContextMenu() {
  const {
    contextMenu, setContextMenu,
    activeId, sources, selectedIds,
    patchSource, removeSource, removeSelected,
  } = useApp()

  const [confirmDeleteSrcId, setConfirmDeleteSrcId] = useState<string | null>(null)

  if (!contextMenu) return null
  const src = sources.find(s => s.id === contextMenu.srcId)
  if (!src) return null

  const isMulti = selectedIds.size > 1

  function handleRename() {
    const detail: RenameSourceDetail = { srcId: src!.id, currentLabel: src!.label ?? src!.raw }
    window.dispatchEvent(new CustomEvent('proof:rename-source', { detail }))
    setContextMenu(null)
  }

  function handleRemove() {
    if (confirmDeleteSrcId === src!.id) {
      if (isMulti) removeSelected()
      else removeSource(src!.id)
      setConfirmDeleteSrcId(null)
      setContextMenu(null)
    } else {
      setConfirmDeleteSrcId(src!.id)
    }
  }

  function handleColor(color: string | null) {
    if (!activeId) return
    patchSource(activeId, src!.id, { color: color ?? undefined })
  }

  const menuBtn: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'none', border: 'none', padding: '9px 14px',
    cursor: 'pointer', fontSize: '12px', color: '#777',
    letterSpacing: '0.04em', fontFamily: 'inherit',
  }

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', left: contextMenu.x, top: contextMenu.y,
        background: '#0f0f0f', border: '1px solid #222',
        zIndex: 200, minWidth: '160px',
        overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      {/* Color swatches */}
      <div style={{ padding: '10px 12px 8px', display: 'flex', alignItems: 'center', gap: '7px', borderBottom: '1px solid #1e1e1e' }}>
        {/* Clear / default */}
        <button
          onClick={() => handleColor(null)}
          title="Default"
          style={{
            width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
            background: TYPE_DEFAULT[src.fileType ?? ''] ?? '#555',
            border: `2px solid ${!src.color ? '#fff' : 'transparent'}`,
            boxShadow: !src.color ? '0 0 0 1px #555' : 'none',
            cursor: 'pointer', padding: 0,
          }}
        />
        {COLORS.map(c => (
          <button
            key={c.value}
            onClick={() => handleColor(c.value)}
            title={c.label}
            style={{
              width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
              background: c.value, border: `2px solid ${src.color === c.value ? '#fff' : 'transparent'}`,
              cursor: 'pointer', padding: 0,
              boxShadow: src.color === c.value ? `0 0 0 1px ${c.value}` : 'none',
            }}
          />
        ))}
      </div>

      {!isMulti && (
        <>
          <button
            onClick={handleRename}
            style={menuBtn}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            Rename
          </button>
          <div style={{ height: '1px', background: '#1e1e1e' }} />
        </>
      )}
      <button
        onClick={handleRemove}
        style={{ ...menuBtn, color: '#c55' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        {confirmDeleteSrcId === src.id
          ? 'Remove?'
          : `Remove${isMulti ? ` ${selectedIds.size}` : ''}`}
      </button>
    </div>
  )
}
