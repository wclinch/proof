'use client'
import dynamic from 'next/dynamic'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { capture } from '@/lib/posthog'
import { uid } from '@/lib/storage'
import type { Highlight, SpanEntry } from '@/lib/types'
import { normStr } from '@/lib/norm'

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false })

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
  const [hov,      setHov]      = useState(false)
  const [dragging, setDragging] = useState(false)
  const [menu,       setMenu]       = useState<{ x: number; y: number } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const isLong = highlight.text.length > 160

  useEffect(() => {
    if (!menu) return
    function close() { setMenu(null); setConfirming(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    // BUG FIX: clamp menu position to viewport so it never appears off-screen
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
          // Custom drag ghost: just the text, not the whole card
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
          style={{
            margin: 0, fontSize: '11px', color: hov ? '#aaa' : '#666',
            lineHeight: 1.6, transition: 'color 0.1s',
            cursor: 'default',
            paddingRight: hov ? '40px' : '0',
          }}
        >
          {hov || !isLong ? highlight.text : highlight.text.slice(0, 160) + '…'}
        </p>
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
}: {
  highlights: Highlight[]
  onJump: (h: Highlight) => void
  onDelete: (id: string) => void
}) {
  return (
    <div style={{
      width: '240px', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      <div style={{
        padding: '12px 12px 8px 12px', flexShrink: 0,
        fontSize: '10px', color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>
        Highlights
      </div>

      {highlights.length === 0 ? (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            'Select text in the PDF — a save button appears above your selection.',
            'Shift+click to extend a selection without dragging.',
            'Drag any highlight into the Synthesis panel on the right.',
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

export default function AnalysisPanel() {
  const {
    selectedSource, activeId,
    patchSource, retrySource,
  } = useApp()

  const highlights: Highlight[] = selectedSource?.highlights ?? []
  const [jumpTo, setJumpTo] = useState<{ page: number; ts: number } | null>(null)

  // Toggle: selecting already-highlighted text removes it, new text adds it
  const handleHighlight = useCallback((text: string, page: number, spans: SpanEntry[]) => {
    if (!selectedSource || !activeId) return
    if (spans.length === 0) return  // BUG FIX: never store empty span arrays
    const current = selectedSource.highlights ?? []

    // BUG FIX: use shared normStr (same function as PdfViewer) so toggle detection
    // is consistent with how span texts are stored and matched during rendering.
    const newSpanTexts = new Set(spans.map(s => normStr(s.text)))
    const normText     = normStr(text)

    let removedSomething = false
    const updated = current.flatMap(h => {
      if (h.page !== page) return [h]
      // Remove the entire highlight if:
      // - the selected text matches the highlight text (full re-selection toggle), OR
      // - any of the selected spans overlap with this highlight's spans (partial re-selection)
      // Either way → remove the whole card. No partial de-highlight.
      const overlaps =
        normStr(h.text) === normText ||
        (h.spans ?? []).some(existingSpan => {
          const newSpan = spans.find(s => normStr(s.text) === normStr(existingSpan.text))
          if (!newSpan) return false
          // Same span text — check if the highlighted ranges actually overlap
          const aStart = existingSpan.start ?? 0
          const aEnd   = existingSpan.end   ?? existingSpan.text.length
          const bStart = newSpan.start ?? 0
          const bEnd   = newSpan.end   ?? newSpan.text.length
          return !(aEnd <= bStart || bEnd <= aStart)
        })
      if (overlaps) { removedSomething = true; return [] }
      return [h]
    })

    if (removedSomething) {
      patchSource(activeId, selectedSource.id, { highlights: updated })
    } else {
      const h: Highlight = { id: uid(), text, page, spans, createdAt: Date.now() }
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
    // BUG FIX: use a monotonic counter instead of Date.now() so jumping to
    // the same page twice in quick succession always triggers the scroll effect.
    setJumpTo({ page: h.page, ts: ++jumpSeqRef.current })
  }, [])

  const isDone = selectedSource?.status === 'done'

  return (
    <div style={{ flex: 1, minWidth: 40, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

      {/* Left: highlights collector — only when a source is loaded */}
      {isDone && (
        <>
          <HighlightsPanel
            highlights={highlights}
            onJump={handleJump}
            onDelete={handleDelete}
          />
          <div style={{ width: '1px', flexShrink: 0, background: '#1a1a1a' }} />
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
                  title: 'Select text to highlight',
                  body: 'A save button appears above your selection. Use Shift+click for longer passages without dragging.',
                },
                {
                  n: '3',
                  title: 'Jump back anytime',
                  body: 'Every highlight has a jump button that scrolls the PDF directly to that passage.',
                },
                {
                  n: '4',
                  title: 'Write from your highlights',
                  body: 'Drag any highlight into the Synthesis panel on the right. Export as .txt or .md when done.',
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
