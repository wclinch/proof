'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { getFile } from '@/lib/idb'

// Rendered in the right column when screenshot is expanded.
// Takes 60% of the right column height, collapse button returns to default.

export default function ScreenshotZone({ onCollapse }: { onCollapse: () => void }) {
  const { selectedImageSource, setSelectedImageId } = useApp()
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const prevUrl = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedImageSource || selectedImageSource.status !== 'done') {
      setImgUrl(null); return
    }
    let cancelled = false
    getFile(selectedImageSource.id).then(file => {
      if (cancelled) return
      if (prevUrl.current) { URL.revokeObjectURL(prevUrl.current); prevUrl.current = null }
      if (!file) { setImgUrl(null); return }
      const url = URL.createObjectURL(file)
      prevUrl.current = url
      setImgUrl(url)
    })
    return () => { cancelled = true }
  }, [selectedImageSource?.id, selectedImageSource?.status])

  useEffect(() => () => {
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const srcId   = e.dataTransfer.getData('application/x-proof-source-id')
    const srcType = e.dataTransfer.getData('application/x-proof-source-type')
    if (srcId && srcType === 'image') setSelectedImageId(srcId)
  }

  function allowDrop(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('application/x-proof-source-id')) e.preventDefault()
  }

  const showImage = !!(selectedImageSource?.status === 'done' && imgUrl)

  return (
    <div
      style={{
        flex: '0 0 60%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#080808',
        borderBottom: '1px solid #1a1a1a',
      }}
      onDragOver={allowDrop}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div style={{
        height: '28px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 8px 0 14px',
        borderBottom: '1px solid #1a1a1a',
        gap: '4px',
      }}>
        <span style={{
          flex: 1, fontSize: '10px', color: '#555',
          letterSpacing: '0.04em', userSelect: 'none',
        }}>
          Reference
        </span>
        <IconBtn onClick={onCollapse} title="Collapse">
          <CollapseIcon />
        </IconBtn>
      </div>

      {/* Content */}
      {!showImage ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', color: '#333', letterSpacing: '0.02em' }}>
            {selectedImageSource && selectedImageSource.status !== 'done'
              ? 'Loading...'
              : 'Drop a reference here'}
          </span>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <img
            src={imgUrl!}
            alt={selectedImageSource!.label ?? selectedImageSource!.raw}
            draggable={false}
            onDragStart={e => e.preventDefault()}
            style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
          />
        </div>
      )}
    </div>
  )
}

function IconBtn({ onClick, title, children }: {
  onClick: () => void; title: string; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px', lineHeight: 0,
        color: hov ? '#999' : '#555',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '2px', flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function CollapseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 1V4H1" /><path d="M10 4H7V1" />
      <path d="M7 10V7H10" /><path d="M1 7H4V10" />
    </svg>
  )
}
