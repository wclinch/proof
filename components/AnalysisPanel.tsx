'use client'
import dynamic from 'next/dynamic'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { capture } from '@/lib/posthog'
import { uid } from '@/lib/storage'
import type { Highlight, HighlightRect } from '@/lib/types'

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false })

// ─── Resize handle ───────────────────────────────────────────────────────────

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '4px', flexShrink: 0, cursor: 'col-resize', zIndex: 10,
        background: hovered ? '#2e2e2e' : '#1a1a1a',
        transition: 'background 0.15s',
      }}
    />
  )
}

// ─── Highlight card ───────────────────────────────────────────────────────────

const MENU_BTN: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'none', border: 'none', padding: '9px 14px',
  cursor: 'pointer', fontSize: '12px', color: '#c55',
  letterSpacing: '0.04em', fontFamily: 'inherit', outline: 'none',
}

function HighlightCard({
  highlight,
  onJump,
  onDelete,
}: {
  highlight: Highlight
  onJump: () => void
  onDelete: () => void
}) {
  const [hov,        setHov]        = useState(false)
  const [dragging,   setDragging]   = useState(false)
  const [menu,       setMenu]       = useState<{ x: number; y: number } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [expanded,   setExpanded]   = useState(false)
  const PREVIEW = 120
  const isLong = highlight.text.length > PREVIEW

  useEffect(() => {
    if (!menu) return
    function close() { setMenu(null); setConfirming(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    const MENU_W = 140, MENU_H = 40
    setMenu({
      x: Math.min(e.clientX, window.innerWidth  - MENU_W - 4),
      y: Math.min(e.clientY, window.innerHeight - MENU_H - 4),
    })
    setConfirming(false)
  }

  function handleRemove() {
    if (confirming) {
      onDelete()
      setMenu(null)
      setConfirming(false)
    } else {
      setConfirming(true)
    }
  }

  return (
    <>
      <div
        draggable
        onDragStart={e => {
          setDragging(true)
          e.dataTransfer.effectAllowed = 'copy'
          e.dataTransfer.setData('application/x-proof-highlight', `"${highlight.text}" — p. ${highlight.page}`)
          const ghost = document.createElement('div')
          ghost.textContent = highlight.text.length > 80 ? highlight.text.slice(0, 80) + '…' : highlight.text
          ghost.style.cssText = 'position:fixed;top:-999px;left:0;background:#1a1a1a;color:#aaa;padding:6px 10px;border-radius:3px;font-size:11px;font-family:inherit;max-width:220px;line-height:1.5;border:1px solid #333;'
          document.body.appendChild(ghost)
          e.dataTransfer.setDragImage(ghost, 12, 12)
          setTimeout(() => document.body.removeChild(ghost), 0)
        }}
        onDragEnd={() => setDragging(false)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onContextMenu={handleContextMenu}
        style={{
          padding: '10px 12px',
          background: hov ? '#111' : 'transparent',
          transition: 'background 0.1s, opacity 0.1s',
          display: 'flex', flexDirection: 'column', gap: '8px',
          borderBottom: '1px solid #0f0f0f',
          cursor: 'grab',
          opacity: dragging ? 0.4 : 1,
          position: 'relative',
        }}
      >
        {hov && (
          <span style={{
            position: 'absolute', top: '8px', right: '10px',
            fontSize: '9px', color: '#333', letterSpacing: '0.06em',
            textTransform: 'uppercase', pointerEvents: 'none',
          }}>
            drag →
          </span>
        )}
        <p
          onClick={() => isLong && setExpanded(v => !v)}
          style={{
            margin: 0, fontSize: '11px', color: hov ? '#aaa' : '#666',
            lineHeight: 1.6, transition: 'color 0.1s',
            paddingRight: hov ? '40px' : '0',
            cursor: isLong ? 'pointer' : 'default',
          }}
        >
          {expanded ? highlight.text : (isLong ? highlight.text.slice(0, PREVIEW) + '…' : highlight.text)}
        </p>
        {isLong && (
          <span
            onClick={() => setExpanded(v => !v)}
            style={{ fontSize: '9px', color: '#333', letterSpacing: '0.06em', cursor: 'pointer', userSelect: 'none' }}
          >
            {expanded ? 'collapse ↑' : 'expand ↓'}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', color: '#333', letterSpacing: '0.06em' }}>p. {highlight.page}</span>
          <button
            onClick={onJump}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: '10px', color: hov ? '#888' : '#444', fontFamily: 'inherit',
              letterSpacing: '0.06em', textTransform: 'uppercase', outline: 'none',
              transition: 'color 0.1s',
            }}
          >
            jump →
          </button>
        </div>
      </div>

      {menu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', left: menu.x, top: menu.y,
            background: '#141414', border: '1px solid #2a2a2a',
            borderRadius: '4px', zIndex: 200, minWidth: '140px',
            overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          <button
            onClick={handleRemove}
            style={MENU_BTN}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {confirming ? 'Confirm?' : 'Remove'}
          </button>
        </div>
      )}
    </>
  )
}

// ─── Highlights panel (left side) ────────────────────────────────────────────

function HighlightsPanel({
  highlights,
  onJump,
  onDelete,
  width,
}: {
  highlights: Highlight[]
  onJump: (h: Highlight) => void
  onDelete: (id: string) => void
  width: number
}) {
  return (
    <div style={{
      width: `${width}px`, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      <div style={{
        padding: '12px 12px 8px 12px', flexShrink: 0,
        fontSize: '10px', color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>
        Clips
      </div>

      {highlights.length === 0 ? (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            'Click any paragraph in the PDF to clip it.',
            'Click a clipped paragraph again to remove it.',
            'Drag any clip into the Synthesis panel to write from it.',
          ].map((tip, i) => (
            <p key={i} style={{ margin: 0, fontSize: '11px', color: '#333', lineHeight: 1.6 }}>
              {tip}
            </p>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 0 16px' }}>
          {highlights.map(h => (
            <HighlightCard
              key={h.id}
              highlight={h}
              onJump={() => onJump(h)}
              onDelete={() => onDelete(h.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

const MIN_CLIPS = 160
const MAX_CLIPS = 500

export default function AnalysisPanel() {
  const {
    selectedSource, activeId,
    patchSource, retrySource,
  } = useApp()

  const highlights: Highlight[] = selectedSource?.highlights ?? []
  const [jumpTo, setJumpTo] = useState<{ page: number; ts: number } | null>(null)

  const [clipsWidth, setClipsWidth] = useState(() => {
    if (typeof window === 'undefined') return 240
    const saved = parseInt(localStorage.getItem('proof-ui-clips-width') || '0', 10)
    return saved > 0 ? Math.max(MIN_CLIPS, Math.min(MAX_CLIPS, saved)) : 240
  })
  const clipsWidthRef = useRef(clipsWidth)

  function startClipsDrag(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = clipsWidthRef.current

    function onMove(ev: MouseEvent) {
      if (ev.buttons === 0) { onUp(); return }
      const delta = ev.clientX - startX
      const w = Math.max(MIN_CLIPS, Math.min(MAX_CLIPS, startW + delta))
      clipsWidthRef.current = w
      setClipsWidth(w)
      localStorage.setItem('proof-ui-clips-width', String(w))
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleHighlight = useCallback((text: string, page: number, rects: HighlightRect[]) => {
    if (!selectedSource || !activeId) return
    if (rects.length === 0) return
    const current = selectedSource.highlights ?? []

    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
    const normText = norm(text)

    let removedSomething = false
    const updated = current.flatMap(h => {
      if (h.page !== page) return [h]
      if (norm(h.text) === normText) { removedSomething = true; return [] }
      return [h]
    })

    if (removedSomething) {
      patchSource(activeId, selectedSource.id, { highlights: updated })
    } else {
      const h: Highlight = { id: uid(), text, page, rects, createdAt: Date.now() }
      patchSource(activeId, selectedSource.id, { highlights: [...current, h] })
      capture('highlight_added')
    }
  }, [selectedSource, activeId, patchSource])

  const handleDelete = useCallback((id: string) => {
    if (!selectedSource || !activeId) return
    patchSource(activeId, selectedSource.id, {
      highlights: (selectedSource.highlights ?? []).filter(h => h.id !== id),
    })
  }, [selectedSource, activeId, patchSource])

  const jumpSeqRef = useRef(0)
  const handleJump = useCallback((h: Highlight) => {
    setJumpTo({ page: h.page, ts: ++jumpSeqRef.current })
  }, [])

  const isDone = selectedSource?.status === 'done'

  return (
    <div style={{ flex: 1, minWidth: 40, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

      {/* Left: clips collector — only when a source is loaded */}
      {isDone && (
        <>
          <HighlightsPanel
            highlights={highlights}
            onJump={handleJump}
            onDelete={handleDelete}
            width={clipsWidth}
          />
          <ResizeHandle onMouseDown={startClipsDrag} />
        </>
      )}

      {/* Right: PDF / status */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {!selectedSource && (
          <div style={{ flex: 1, padding: '32px 28px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  How it works
                </span>
              </div>
              {[
                {
                  n: '1',
                  title: 'Drop a PDF',
                  body: 'Add a source from the left panel. It loads instantly — no processing.',
                },
                {
                  n: '2',
                  title: 'Click to clip a paragraph',
                  body: 'Single click on any paragraph to clip it. Click again to remove it.',
                },
                {
                  n: '3',
                  title: 'Jump back anytime',
                  body: 'Every clip has a jump button that scrolls the PDF directly back to that passage.',
                },
                {
                  n: '4',
                  title: 'Write from your clips',
                  body: 'Drag any clip into the Synthesis panel on the right. Export as .txt or .md when done.',
                },
              ].map(step => (
                <div key={step.n} style={{ display: 'flex', gap: '16px' }}>
                  <span style={{
                    fontSize: '11px', color: '#2a2a2a', flexShrink: 0,
                    letterSpacing: '0.06em', marginTop: '2px',
                  }}>
                    {step.n}.
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#555', fontWeight: 500 }}>{step.title}</span>
                    <span style={{ fontSize: '12px', color: '#333', lineHeight: 1.7 }}>{step.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSource?.status === 'queued' && (
          <div style={{ padding: '24px', fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            queued.
          </div>
        )}

        {selectedSource?.status === 'error' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {selectedSource.error}
            </div>
            <button
              onClick={() => retrySource(selectedSource.id)}
              style={{
                alignSelf: 'flex-start', background: 'none', border: '1px solid #222',
                borderRadius: '3px', padding: '5px 10px', cursor: 'pointer', outline: 'none',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'inherit', color: '#666',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#333' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = '#222' }}
            >
              ↺ retry
            </button>
          </div>
        )}

        {isDone && (
          <PdfViewer
            srcId={selectedSource.id}
            highlights={highlights}
            jumpTo={jumpTo}
            onHighlight={handleHighlight}
          />
        )}
      </div>
    </div>
  )
}
