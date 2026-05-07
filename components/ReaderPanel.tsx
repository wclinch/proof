'use client'
import { useState, useCallback, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { getSentenceWindow } from '@/lib/sentences'
import { uid } from '@/lib/storage'
import type { Clip, Sentence } from '@/lib/types'
import ClipCard from './ClipCard'

// ─── Onboarding helpers ──────────────────────────────────────────────────────
// proof-ob: null → 'c' (clipped) → 'd' (done / dismissed)

function obGet() {
  if (typeof window === 'undefined') return 'd'
  return localStorage.getItem('proof-ob') ?? ''
}
function obSet(v: string) {
  if (typeof window !== 'undefined') localStorage.setItem('proof-ob', v)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReaderPanel({
  clipsWidth,
  onClipsDragStart,
}: {
  clipsWidth: number
  onClipsDragStart: (e: React.MouseEvent) => void
}) {
  const { selectedSource, activeId, addClip, removeClip, retrySource } = useApp()

  // Onboarding state — one flag covers the whole flow
  const [obPhase, setObPhase] = useState<string>(obGet)
  const isDone = obPhase === 'd'

  // Advance to 'clipped' when the first clip is created (if not already past it)
  useEffect(() => {
    if (isDone || obPhase === 'c') return
    const hasClip = selectedSource?.clips && selectedSource.clips.length > 0
    if (hasClip) { obSet('c'); setObPhase('c') }
  }, [selectedSource?.clips, isDone, obPhase])

  function dismissOb() { obSet('d'); setObPhase('d') }

  const handleSentenceClick = useCallback((sentence: Sentence) => {
    if (!selectedSource || !activeId) return
    const content = selectedSource.content
    if (!content) return

    const srcId = selectedSource.id
    const currentClips = selectedSource.clips

    // ── Case 1: sentence is inside an existing clip ──────────────────────────
    // Remove only that sentence; keep the rest of the clip intact.
    const containing = currentClips.find(c => c.sentenceIds.includes(sentence.i))
    if (containing) {
      if (containing.sentenceIds.length <= 1) {
        // Last sentence in clip → remove entire clip
        removeClip(srcId, containing.id)
      } else {
        const newIds = containing.sentenceIds.filter(id => id !== sentence.i)
        // Preserve original centreIdx if it still exists; otherwise pick midpoint
        const newCentre = newIds.includes(containing.centreIdx)
          ? containing.centreIdx
          : newIds[Math.floor(newIds.length / 2)]
        removeClip(srcId, containing.id)
        addClip(srcId, { id: uid(), sentenceIds: newIds, centreIdx: newCentre, createdAt: containing.createdAt })
      }
      return
    }

    // ── Case 2: sentence is immediately adjacent to an existing clip ─────────
    // Extend that clip by one sentence rather than creating a new one.
    const adjacent = currentClips.find(c => {
      const lo = Math.min(...c.sentenceIds)
      const hi = Math.max(...c.sentenceIds)
      return sentence.i === lo - 1 || sentence.i === hi + 1
    })
    if (adjacent) {
      const newIds = [...adjacent.sentenceIds, sentence.i].sort((a, b) => a - b)
      removeClip(srcId, adjacent.id)
      addClip(srcId, { id: uid(), sentenceIds: newIds, centreIdx: adjacent.centreIdx, createdAt: adjacent.createdAt })
      return
    }

    // ── Case 3: unclipped, non-adjacent → auto-create 3-sentence window ──────
    const allSentences: Sentence[] = []
    for (const block of content.blocks) {
      for (const s of block.sentences) allSentences.push(s)
    }
    const clickedPos = allSentences.findIndex(s => s.i === sentence.i)
    if (clickedPos === -1) return

    const { s, e } = getSentenceWindow(allSentences.length, clickedPos)
    const windowSents = allSentences.slice(s, e + 1)
    addClip(srcId, {
      id: uid(),
      sentenceIds: windowSents.map(s => s.i),
      centreIdx: sentence.i,
      createdAt: Date.now(),
    })
  }, [selectedSource, activeId, addClip, removeClip])

  function handleInsert(text: string) {
    window.dispatchEvent(new CustomEvent('proof-send-to-draft', { detail: text }))
  }

  const clips = selectedSource?.clips ?? []
  const content = selectedSource?.content

  // Build the set of sentence IDs that are in any clip (for highlight)
  const clippedIds = new Set<number>()
  for (const clip of clips) {
    for (const id of clip.sentenceIds) clippedIds.add(id)
  }

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

      {/* ── Clips sidebar ── */}
      {selectedSource?.status === 'done' && (
        <>
          <div style={{
            width: clipsWidth, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            borderRight: '1px solid #1a1a1a', overflow: 'hidden',
          }}>
            <div style={{
              padding: '0 12px', height: '40px', flexShrink: 0,
              display: 'flex', alignItems: 'center',
              borderBottom: '1px solid #1a1a1a',
              fontSize: '10px', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Clips
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {clips.length === 0 ? (
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#444', lineHeight: 1.6 }}>
                    Click any sentence to clip it.
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#2a2a2a', lineHeight: 1.6 }}>
                    Each clip captures the sentence plus its context. You can trim or extend it from there.
                  </p>
                </div>
              ) : (
                <>
                  {clips.map(clip => content ? (
                    <ClipCard
                      key={clip.id}
                      clip={clip}
                      content={content}
                      onDelete={() => removeClip(selectedSource!.id, clip.id)}
                      onInsert={handleInsert}
                    />
                  ) : null)}
                  {/* Step 3 onboarding hint — shown until first insert */}
                  {obPhase !== 'd' && obPhase !== '' && (
                    <ObHint onDismiss={dismissOb} style={{ margin: '4px 0 0', borderTop: '1px solid #111' }}>
                      Hover a clip, then click Insert to add it to your draft.
                    </ObHint>
                  )}
                </>
              )}
            </div>
          </div>
          <div
            onMouseDown={onClipsDragStart}
            style={{
              width: '5px', flexShrink: 0, cursor: 'col-resize', zIndex: 10,
              background: '#1a1a1a',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
          />
        </>
      )}

      {/* ── Reader / status ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {!selectedSource && <EmptyState />}

        {selectedSource?.status === 'queued' && (
          <StatusMsg>Waiting...</StatusMsg>
        )}

        {selectedSource?.status === 'extracting' && (
          <StatusMsg>Reading document...</StatusMsg>
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
              ↺ Try again
            </button>
          </div>
        )}

        {selectedSource?.status === 'done' && content && (
          <div style={{
            flex: 1, overflowY: 'auto',
            background: '#0e0e0e',
            display: 'flex', justifyContent: 'center',
            padding: '40px 8px 80px',
          }}>
            <div style={{
              width: '100%', maxWidth: '780px',
              background: '#f5f2ed',
              borderRadius: '6px',
              padding: '56px 64px',
              boxShadow: '0 2px 24px rgba(0,0,0,0.4)',
              alignSelf: 'flex-start',
            }}>
              {chunkSentences(content.blocks.flatMap(b => b.sentences), 4).map((group, gi) => (
                <div key={gi} style={{ marginBottom: '2.4em' }}>
                  {group.map(sentence => {
                    const isClipped = clippedIds.has(sentence.i)
                    const isCentre  = clips.some(c => c.centreIdx === sentence.i)
                    return (
                      <SentenceSpan
                        key={sentence.i}
                        text={sentence.text}
                        isClipped={isClipped}
                        isCentre={isCentre}
                        onClick={() => handleSentenceClick(sentence)}
                      />
                    )
                  })}
                </div>
              ))}

              {/* Step 2 onboarding hint — shown when source is loaded but no clips yet */}
              {clips.length === 0 && !isDone && (
                <div style={{
                  marginTop: '1em',
                  paddingTop: '1.6em',
                  borderTop: '1px solid #e2ded8',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{
                    fontSize: '12px', color: '#a8a39c',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontStyle: 'italic',
                  }}>
                    Click any sentence to create a clip.
                  </span>
                  <button
                    onClick={dismissOb}
                    onMouseEnter={e => (e.currentTarget.style.color = '#8a847c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#c8c3bb')}
                    style={{
                      background: 'none', border: 'none', padding: '2px 4px',
                      cursor: 'pointer', fontSize: '13px', color: '#c8c3bb',
                      fontFamily: 'inherit', outline: 'none', lineHeight: 1,
                      transition: 'color 0.1s',
                    }}
                    title="Dismiss"
                  >×</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chunkSentences<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// Subtle onboarding hint used in the clips panel
function ObHint({ children, onDismiss, style }: {
  children: React.ReactNode
  onDismiss: () => void
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', gap: '8px', ...style,
    }}>
      <span style={{ fontSize: '11px', color: '#333', lineHeight: 1.5 }}>{children}</span>
      <button
        onClick={onDismiss}
        onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
        onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        style={{
          background: 'none', border: 'none', padding: '2px 4px', flexShrink: 0,
          cursor: 'pointer', fontSize: '13px', color: '#555',
          fontFamily: 'inherit', outline: 'none', lineHeight: 1,
          transition: 'color 0.1s',
        }}
        title="Dismiss"
      >×</button>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SentenceSpan({
  text, isClipped, isCentre, onClick,
}: {
  text: string
  isClipped: boolean
  isCentre: boolean
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)

  const bg = isClipped
    ? isCentre ? 'rgba(210,150,0,0.38)' : 'rgba(210,150,0,0.18)'
    : hov      ? 'rgba(0,0,0,0.07)' : 'transparent'

  return (
    <>
      <span
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          cursor: 'pointer',
          background: bg,
          borderRadius: '2px',
          padding: '2px 3px',
          margin: '0 -3px',
          fontSize: '16px',
          lineHeight: 1.85,
          color: '#2a2520',
          fontFamily: 'Georgia, "Times New Roman", serif',
          transition: 'background 0.12s',
          display: 'inline',
        }}
      >
        {text}
      </span>{' '}
    </>
  )
}

function StatusMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ flex: 1, padding: '32px 28px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Get started
          </span>
        </div>
        {[
          { n: '1', title: 'Add a document', body: 'Drop a PDF into the left panel. It\'s ready to read in seconds.' },
          { n: '2', title: 'Clip sentences', body: 'Click any sentence to clip it with its surrounding context.' },
          { n: '3', title: 'Build your draft', body: 'Insert clips into your draft at the cursor and keep writing.' },
        ].map(step => (
          <div key={step.n} style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '11px', color: '#2a2a2a', flexShrink: 0, letterSpacing: '0.06em', marginTop: '2px' }}>
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
  )
}
