'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Viewer, Worker } from '@react-pdf-viewer/core'
import { highlightPlugin } from '@react-pdf-viewer/highlight'
import { searchPlugin } from '@react-pdf-viewer/search'
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/highlight/lib/styles/index.css'
import { getFile } from '@/lib/idb'
import type { Highlight, HighlightRect } from '@/lib/types'

const WORKER_URL = '/pdf.worker.legacy.min.js'

const MSG: React.CSSProperties = {
  padding: '24px', fontSize: '11px', color: '#555',
  letterSpacing: '0.08em', textTransform: 'uppercase',
}

const BTN: React.CSSProperties = {
  background: '#1c1c1c', border: '1px solid #333', borderRadius: '4px',
  padding: '5px 14px', fontSize: '11px', color: '#ccc',
  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em',
  textTransform: 'uppercase', outline: 'none',
  boxShadow: '0 2px 12px rgba(0,0,0,0.6)', whiteSpace: 'nowrap',
}

const navBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer',
  fontSize: '12px', color: '#777', fontFamily: 'inherit', outline: 'none',
  borderRadius: '3px',
}

export default function PdfViewer({
  srcId,
  highlights = [],
  jumpTo,
  onHighlight,
}: {
  srcId: string
  highlights?: Highlight[]
  jumpTo?: { page: number; ts: number } | null
  onHighlight?: (text: string, page: number, rects: HighlightRect[]) => void
}) {
  const [fileUrl,    setFileUrl]    = useState<string | null>(null)
  const [missing,    setMissing]    = useState(false)
  const [totalPages, setTotalPages] = useState(0)
  const [curPage,    setCurPage]    = useState(1)
  const [showFind,   setShowFind]   = useState(false)
  const [findTerm,   setFindTerm]   = useState('')
  const [hlVersion,  setHlVersion]  = useState(0)

  // Stable refs — plugins are created once, callbacks always read latest values
  const highlightsRef   = useRef(highlights)
  const onHighlightRef  = useRef(onHighlight)
  const jumpToRef       = useRef<((idx: number) => void) | null>(null)
  const findInputRef    = useRef<HTMLInputElement>(null)

  useEffect(() => { highlightsRef.current = highlights; setHlVersion(v => v + 1) }, [highlights])
  useEffect(() => { onHighlightRef.current = onHighlight }, [onHighlight])

  useEffect(() => {
    let url: string | null = null
    setFileUrl(null); setMissing(false); setTotalPages(0); setCurPage(1)
    setFindTerm(''); setShowFind(false)
    getFile(srcId).then(f => {
      if (f) { url = URL.createObjectURL(f); setFileUrl(url) }
      else setMissing(true)
    })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [srcId])

  useEffect(() => {
    if (jumpTo && jumpToRef.current) jumpToRef.current(jumpTo.page - 1)
  }, [jumpTo])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault(); setShowFind(true)
        setTimeout(() => findInputRef.current?.focus(), 30)
      }
      if (e.key === 'Escape' && showFind) { setShowFind(false); setFindTerm('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showFind])

  // ─── Plugins — all created once with [] to keep hook count stable ─────────────

  const pageNavPlugin = useMemo(() => {
    const p = pageNavigationPlugin()
    return p
  }, [])
  const { jumpToPage } = pageNavPlugin
  useEffect(() => { jumpToRef.current = jumpToPage }, [jumpToPage])

  const searchPluginInstance = useMemo(() => searchPlugin(), [])
  const { highlight: doSearch, clearHighlights, jumpToNextMatch, jumpToPreviousMatch } = searchPluginInstance

  function handleSearch(term: string) {
    if (!term.trim()) { clearHighlights(); return }
    doSearch([{ keyword: term, matchCase: false, wholeWords: false }])
  }

  const highlightPluginInstance = useMemo(() => {
    function ov(a: HighlightRect, b: HighlightRect) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    }

    return highlightPlugin({
      renderHighlightTarget: ({ selectionRegion, selectedText, highlightAreas, toggle }) => {
        const text = selectedText.trim()
        if (!text || text.length < 3 || !highlightAreas.length) return <></>

        const page = highlightAreas[0].pageIndex + 1
        const selRects = highlightAreas.map(a => ({
          x: a.left / 100, y: a.top / 100, w: a.width / 100, h: a.height / 100,
        }))
        const isRemove = highlightsRef.current
          .filter(h => h.page === page)
          .some(h => (h.rects ?? []).some(hr => selRects.some(sr => ov(hr, sr))))

        return (
          <div style={{
            position: 'absolute',
            left: `${selectionRegion.left}%`,
            top: `${selectionRegion.top}%`,
            transform: 'translateY(-110%)',
            zIndex: 100,
          }}>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                const rects: HighlightRect[] = highlightAreas.map(a => ({
                  x: a.left / 100, y: a.top / 100,
                  w: a.width / 100, h: a.height / 100,
                }))
                onHighlightRef.current?.(text, page, rects)
                toggle()
              }}
              style={BTN}
            >
              {isRemove ? 'remove →' : 'highlight →'}
            </button>
          </div>
        )
      },

      renderHighlights: ({ pageIndex }) => (
        <>
          {highlightsRef.current
            .filter(h => h.page === pageIndex + 1)
            .flatMap(h => (h.rects ?? []).map((rect, ri) => (
              <div
                key={`${h.id}-${ri}`}
                style={{
                  position: 'absolute',
                  left:   `${rect.x * 100}%`,
                  top:    `${rect.y * 100}%`,
                  width:  `${rect.w * 100}%`,
                  height: `${rect.h * 100}%`,
                  background: 'rgba(255,213,0,0.38)',
                  borderRadius: '1px',
                  pointerEvents: 'none',
                }}
              />
            )))}
        </>
      ),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toolbar — only when loaded */}
      {totalPages > 0 && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px',
          padding: '0 12px', height: '32px', borderBottom: '1px solid #111',
          background: '#080808',
        }}>
          <button
            onClick={() => { setShowFind(v => !v); setTimeout(() => findInputRef.current?.focus(), 30) }}
            title="Search in PDF (Cmd+F)"
            style={{
              background: showFind ? '#1a1a1a' : 'none', border: 'none', padding: '3px 8px',
              borderRadius: '3px', cursor: 'pointer', fontSize: '10px',
              color: showFind ? '#aaa' : '#555', letterSpacing: '0.08em',
              textTransform: 'uppercase', fontFamily: 'inherit', outline: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e => (e.currentTarget.style.color = showFind ? '#aaa' : '#555')}
          >find</button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#444', letterSpacing: '0.06em' }}>p.</span>
            <input
              key={curPage}
              defaultValue={curPage}
              title="Jump to page"
              onFocus={e => e.target.select()}
              onBlur={e => { const n = parseInt(e.target.value); if (n >= 1 && n <= totalPages) jumpToPage(n - 1) }}
              onKeyDown={e => {
                if (e.key === 'Enter') { const n = parseInt((e.target as HTMLInputElement).value); if (n >= 1 && n <= totalPages) jumpToPage(n - 1); (e.target as HTMLInputElement).blur() }
                if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
              }}
              style={{ width: '28px', background: 'transparent', border: 'none', outline: 'none', fontSize: '10px', color: '#777', fontFamily: 'inherit', letterSpacing: '0.06em', textAlign: 'center', padding: 0 }}
            />
            <span style={{ fontSize: '10px', color: '#333', letterSpacing: '0.06em' }}>/ {totalPages}</span>
          </div>
        </div>
      )}

      {/* Find bar */}
      {showFind && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '34px', borderBottom: '1px solid #111', background: '#0a0a0a' }}>
          <input
            ref={findInputRef}
            value={findTerm}
            onChange={e => { setFindTerm(e.target.value); handleSearch(e.target.value) }}
            onKeyDown={e => {
              if (e.key === 'Enter') jumpToNextMatch()
              if (e.key === 'Escape') { setShowFind(false); setFindTerm(''); clearHighlights() }
            }}
            placeholder="search..."
            style={{ flex: 1, background: '#111', border: '1px solid #1a1a1a', borderRadius: '3px', padding: '4px 10px', fontSize: '12px', color: '#bbb', outline: 'none', fontFamily: 'inherit', letterSpacing: '0.04em' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#333')}
            onBlur={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
          />
          <button onClick={jumpToPreviousMatch} style={navBtn}>↑</button>
          <button onClick={jumpToNextMatch} style={navBtn}>↓</button>
          <button onClick={() => { setShowFind(false); setFindTerm(''); clearHighlights() }} style={{ ...navBtn, color: '#555' }}>×</button>
        </div>
      )}

      {/* Worker always rendered — keeps hook tree stable */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#080808' }}>
        <Worker workerUrl={WORKER_URL}>
          {missing && <div style={MSG}>file not found — re-upload to view.</div>}
          {!fileUrl && !missing && <div style={MSG}>loading...</div>}
          {fileUrl && (
            <div style={{ height: '100%', overflow: 'auto' }}>
              <Viewer
                fileUrl={fileUrl}
                plugins={[highlightPluginInstance, pageNavPlugin, searchPluginInstance]}
                defaultScale={1}
                onPageChange={e => setCurPage(e.currentPage + 1)}
                onDocumentLoad={e => setTotalPages(e.doc.numPages)}
              />
            </div>
          )}
        </Worker>
      </div>
    </div>
  )
}
