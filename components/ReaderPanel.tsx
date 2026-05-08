'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { getSentenceWindow } from '@/lib/sentences'
import { uid } from '@/lib/storage'
import type { Clip, Sentence } from '@/lib/types'
import ClipCard from './ClipCard'
import ExtractionComposer from './ExtractionComposer'

// ─── Onboarding helpers ──────────────────────────────────────────────────────

function obGet() {
  if (typeof window === 'undefined') return 'd'
  return localStorage.getItem('proof-ob') ?? ''
}
function obSet(v: string) {
  if (typeof window !== 'undefined') localStorage.setItem('proof-ob', v)
}

// ─── Transient extraction state ───────────────────────────────────────────────

interface Transient {
  sentences: Sentence[]
  centreId:  number
  rect:      DOMRect
  sourceId:  string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReaderPanel({
  clipsWidth,
  onClipsDragStart,
}: {
  clipsWidth: number
  onClipsDragStart: (e: React.MouseEvent) => void
}) {
  const { selectedSource, activeId, addClip, removeClip, updateClip, reorderClips, retrySource } = useApp()

  const [obPhase, setObPhase]       = useState<string>(obGet)
  const isDone                      = obPhase === 'd'
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null)
  const [dropOverClipId, setDropOverClipId] = useState<string | null>(null)

  useEffect(() => {
    if (isDone || obPhase === 'c') return
    const hasClip = selectedSource?.clips && selectedSource.clips.length > 0
    if (hasClip) { obSet('c'); setObPhase('c') }
  }, [selectedSource?.clips, isDone, obPhase])

  function dismissOb() { obSet('d'); setObPhase('d') }

  // ── Transient composer state ────────────────────────────────────────────────
  const [transient, setTransient]             = useState<Transient | null>(null)
  const [savedDropTarget, setSavedDropTarget] = useState(false)
  const composerDraggingRef                   = useRef(false)

  // Dismiss composer when source changes
  useEffect(() => { setTransient(null) }, [selectedSource?.id])

  const handleSentenceClick = useCallback((sentence: Sentence, rect: DOMRect) => {
    if (composerDraggingRef.current) return
    if (!selectedSource || !activeId) return
    const content = selectedSource.content
    if (!content) return

    const srcId        = selectedSource.id
    const currentClips = selectedSource.clips

    // Clicking a sentence already in a saved clip removes it
    const containing = currentClips.find(c => c.sentenceIds.includes(sentence.i))
    if (containing) {
      if (containing.sentenceIds.length <= 1) {
        removeClip(srcId, containing.id)
      } else {
        const newIds = containing.sentenceIds.filter(id => id !== sentence.i)
        const newCentre = newIds.includes(containing.centreIdx)
          ? containing.centreIdx
          : newIds[Math.floor(newIds.length / 2)]
        removeClip(srcId, containing.id)
        addClip(srcId, {
          id: uid(), sentenceIds: newIds,
          centreIdx: newCentre, createdAt: containing.createdAt,
        })
      }
      return
    }

    // Any other sentence opens the extraction composer
    const allSentences: Sentence[] = content.blocks.flatMap(b => b.sentences)
    const clickedPos = allSentences.findIndex(s => s.i === sentence.i)
    if (clickedPos === -1) return

    const { s, e } = getSentenceWindow(allSentences.length, clickedPos)
    const windowSents = allSentences.slice(s, e + 1)

    setTransient({ sentences: windowSents, centreId: sentence.i, rect, sourceId: srcId })
  }, [selectedSource, activeId, addClip, removeClip])

  function handleInsert(text: string, meta?: { pageLabel?: string; sourceLabel?: string }) {
    window.dispatchEvent(new CustomEvent('proof-send-to-draft', { detail: { text, ...meta } }))
  }

  function handleSavedDrop(e: React.DragEvent) {
    e.preventDefault()
    setSavedDropTarget(false)
    if (!selectedSource || !activeId || !content) return
    const sentIdStr = e.dataTransfer.getData('application/x-proof-sentence-id')
    if (!sentIdStr) return
    const sentId = parseInt(sentIdStr)
    const allSents = content.blocks.flatMap(b => b.sentences)
    const sent = allSents.find(s => s.i === sentId)
    if (!sent) return
    addClip(selectedSource.id, { id: uid(), sentenceIds: [sentId], centreIdx: sentId, createdAt: Date.now() })
    if (obPhase === '') { obSet('c'); setObPhase('c') }
  }

  function handleSavedDragOver(e: React.DragEvent) {
    const types = Array.from(e.dataTransfer.types)
    if (!types.includes('application/x-proof-sentence-id')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setSavedDropTarget(true)
  }

  const clips   = selectedSource?.clips ?? []
  const content = selectedSource?.content

  const clippedIds = new Set<number>()
  for (const clip of clips) {
    for (const id of clip.sentenceIds) clippedIds.add(id)
  }

  const transientIds = new Set(transient?.sentences.map(s => s.i) ?? [])

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

      {/* ── Clips sidebar ── */}
      {selectedSource?.status === 'done' && (
        <>
          <div
            onDragOver={handleSavedDragOver}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSavedDropTarget(false) }}
            onDrop={handleSavedDrop}
            style={{
              width: clipsWidth, flexShrink: 0,
              display: 'flex', flexDirection: 'column',
              borderRight: '1px solid #1a1a1a', overflow: 'hidden',
              background: savedDropTarget ? '#0d0d0d' : 'transparent',
              transition: 'background 0.1s',
            }}
          >
            <div style={{
              padding: '0 12px', height: '40px', flexShrink: 0,
              display: 'flex', alignItems: 'center',
              borderBottom: '1px solid #1a1a1a',
              fontSize: '10px', color: savedDropTarget ? '#aaa' : '#888',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              transition: 'color 0.1s',
            }}>
              {savedDropTarget ? 'Drop to save' : 'Saved'}
            </div>

            <div
              style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
              onDragOver={e => { if (Array.from(e.dataTransfer.types).includes('application/x-proof-clip-id')) e.preventDefault() }}
              onDragLeave={() => setDropOverClipId(null)}
              onDrop={e => {
                const clipId = e.dataTransfer.getData('application/x-proof-clip-id')
                if (!clipId || !selectedSource) return
                e.preventDefault()
                reorderClips(selectedSource.id, clipId, dropOverClipId)
                setDraggingClipId(null)
                setDropOverClipId(null)
              }}
            >
              {clips.length === 0 ? (
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#777', lineHeight: 1.6 }}>
                    Click a sentence, then drag it here to save.
                  </p>
                </div>
              ) : (
                <>
                  {clips.map(clip => content ? (
                    <div
                      key={clip.id}
                      onDragEnter={() => { if (draggingClipId && draggingClipId !== clip.id) setDropOverClipId(clip.id) }}
                      style={{ borderTop: dropOverClipId === clip.id ? '1px solid #444' : '1px solid transparent' }}
                    >
                      <ClipCard
                        clip={clip}
                        content={content}
                        sourceLabel={selectedSource!.label ?? selectedSource!.raw}
                        onDelete={() => removeClip(selectedSource!.id, clip.id)}
                        onInsert={(text, meta) => handleInsert(text, meta)}
                        onUpdate={editedText => updateClip(selectedSource!.id, clip.id, { editedText })}
                        isDragging={draggingClipId === clip.id}
                        onDragStart={e => { setDraggingClipId(clip.id) }}
                        onDragEnd={() => { setDraggingClipId(null); setDropOverClipId(null) }}
                      />
                    </div>
                  ) : null)}
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

        {selectedSource?.status === 'done' && !content && (
          <StatusMsg>Loading...</StatusMsg>
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
              {(() => {
                const allSents = content.blocks.flatMap(b => b.sentences)
                const groups   = buildPageGroups(allSents, 4)
                const hasPages = allSents.some(s => s.page && s.page >= 1)

                return groups.flatMap(({ page, sents, showMarker }, gi) => {
                  const nodes = []

                  if (hasPages && showMarker && page >= 1) {
                    nodes.push(
                      <div key={`pm-${gi}`} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        margin: gi === 0 ? '-36px 0 28px' : '0.8em 0 1.8em',
                        userSelect: 'none', pointerEvents: 'none',
                      }}>
                        <div style={{ flex: 1, height: '1px', background: '#dedad4' }} />
                        <span style={{
                          fontSize: '9px', color: '#b8b3ab',
                          letterSpacing: '0.1em', fontFamily: 'inherit',
                        }}>
                          p. {page}
                        </span>
                      </div>
                    )
                  }

                  nodes.push(
                    <div key={gi} style={{ marginBottom: '2.4em' }}>
                      {sents.map(sentence => {
                        const isClipped         = clippedIds.has(sentence.i)
                        const isCentre          = clips.some(c => c.centreIdx === sentence.i)
                        const isTransient       = transientIds.has(sentence.i)
                        const isTransientCentre = transient?.centreId === sentence.i
                        return (
                          <SentenceSpan
                            key={sentence.i}
                            text={sentence.text}
                            isClipped={isClipped}
                            isCentre={isCentre}
                            isTransient={isTransient}
                            isTransientCentre={isTransientCentre}
                            onClick={(rect) => handleSentenceClick(sentence, rect)}
                          />
                        )
                      })}
                    </div>
                  )

                  return nodes
                })
              })()}

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
                    Click any sentence to extract it.
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

      {/* ── Extraction composer (transient) ── */}
      {transient && selectedSource && (
        <ExtractionComposer
          sentences={transient.sentences}
          centreId={transient.centreId}
          sourceLabel={selectedSource.label ?? selectedSource.raw}
          anchorRect={transient.rect}
          onDismiss={() => setTransient(null)}
          onDragStateChange={dragging => { composerDraggingRef.current = dragging }}
        />
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPageGroups(
  sentences: Sentence[],
  chunkSize: number,
): Array<{ page: number; sents: Sentence[]; showMarker: boolean }> {
  const byPage: Array<{ page: number; sents: Sentence[] }> = []
  for (const s of sentences) {
    const pg   = s.page ?? 0
    const last = byPage[byPage.length - 1]
    if (last && last.page === pg) last.sents.push(s)
    else byPage.push({ page: pg, sents: [s] })
  }

  const result: Array<{ page: number; sents: Sentence[]; showMarker: boolean }> = []
  for (const { page, sents } of byPage) {
    for (let i = 0; i < sents.length; i += chunkSize) {
      result.push({ page, sents: sents.slice(i, i + chunkSize), showMarker: i === 0 })
    }
  }
  return result
}

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
  text, isClipped, isCentre, isTransient, isTransientCentre, onClick,
}: {
  text: string
  isClipped: boolean
  isCentre: boolean
  isTransient: boolean
  isTransientCentre: boolean
  onClick: (rect: DOMRect) => void
}) {
  const [hov, setHov] = useState(false)

  const bg = isTransientCentre ? 'rgba(210,150,0,0.34)'
    : isTransient       ? 'rgba(210,150,0,0.12)'
    : isClipped         ? 'rgba(210,150,0,0.20)'
    : hov               ? 'rgba(0,0,0,0.07)'     : 'transparent'

  return (
    <>
      <span
        onClick={e => onClick(e.currentTarget.getBoundingClientRect())}
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
      fontSize: '11px', color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase',
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
          <span style={{ fontSize: '11px', color: '#888', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Get started
          </span>
        </div>
        {[
          { n: '1', title: 'Add a document', body: 'Drop a PDF into the left panel. It\'s ready to read in seconds.' },
          { n: '2', title: 'Extract sentences', body: 'Click any sentence to open the extraction composer.' },
          { n: '3', title: 'Build your draft', body: 'Insert directly into your draft, or save for later.' },
        ].map(step => (
          <div key={step.n} style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '11px', color: '#666', flexShrink: 0, letterSpacing: '0.06em', marginTop: '2px' }}>
              {step.n}.
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: '#999', fontWeight: 500 }}>{step.title}</span>
              <span style={{ fontSize: '12px', color: '#666', lineHeight: 1.7 }}>{step.body}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
