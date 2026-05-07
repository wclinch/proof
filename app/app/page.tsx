'use client'
import { AppProvider } from '@/context/AppContext'
import ProjectBar        from '@/components/ProjectBar'
import SourcePanel       from '@/components/SourcePanel'
import ReaderPanel       from '@/components/ReaderPanel'
import DraftPanel        from '@/components/DraftPanel'
import ProjectsModal     from '@/components/ProjectsModal'
import SourceContextMenu from '@/components/SourceContextMenu'
import { useApp }        from '@/context/AppContext'
import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SOURCE = 160
const MAX_SOURCE = 360
const DEF_SOURCE = 220

const MIN_CLIPS  = 160
const MAX_CLIPS  = 420
const DEF_CLIPS  = 240

const MIN_DRAFT  = 280
const DEF_DRAFT  = 420

const MIN_READER = 320  // minimum width for the document reading area
const HANDLE_W   = 5    // resize handle width in px

// ─── StorageWarning ───────────────────────────────────────────────────────────

function StorageWarning() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      setMsg(detail)
      setTimeout(() => setMsg(null), 4000)
    }
    window.addEventListener('proof-storage-warning', handler)
    return () => window.removeEventListener('proof-storage-warning', handler)
  }, [])
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      background: '#1a0f0f', border: '1px solid #4a2020', borderRadius: '4px',
      padding: '9px 16px', fontSize: '12px', color: '#a55', letterSpacing: '0.04em',
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {msg}
    </div>
  )
}

// ─── ResizeHandle ─────────────────────────────────────────────────────────────

function ResizeHandle({
  onMouseDown,
  dragging,
}: {
  onMouseDown: (e: React.MouseEvent) => void
  dragging: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: `${HANDLE_W}px`, flexShrink: 0, cursor: 'col-resize', zIndex: 10,
        background: dragging ? '#333' : hov ? '#2a2a2a' : '#1a1a1a',
        transition: dragging ? 'none' : 'background 0.12s',
      }}
    />
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function useDragWidth(
  storageKey: string,
  defaultVal: number,
  min: number,
  max: number,
) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultVal
    const saved = parseInt(localStorage.getItem(storageKey) || '0', 10)
    return saved > 0 ? Math.max(min, Math.min(max, saved)) : defaultVal
  })
  const widthRef = useRef(width)

  const [dragging, setDragging] = useState(false)

  const startDrag = useCallback((
    e: React.MouseEvent,
    direction: 'ltr' | 'rtl',   // ltr = dragging right grows, rtl = dragging right shrinks
    getMax: () => number,
  ) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = widthRef.current
    setDragging(true)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    function onMove(ev: MouseEvent) {
      if (ev.buttons === 0) { onUp(); return }
      const delta = ev.clientX - startX
      const raw = direction === 'ltr' ? startW + delta : startW - delta
      const w = Math.max(min, Math.min(getMax(), raw))
      widthRef.current = w
      setWidth(w)
      localStorage.setItem(storageKey, String(w))
    }

    function onUp() {
      setDragging(false)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [min, max, storageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return { width, widthRef, dragging, startDrag }
}

function Layout() {
  const { mounted } = useApp()

  const source = useDragWidth('proof-ui-source-width', DEF_SOURCE, MIN_SOURCE, MAX_SOURCE)
  const clips  = useDragWidth('proof-ui-clips-width',  DEF_CLIPS,  MIN_CLIPS,  MAX_CLIPS)
  const draft  = useDragWidth('proof-ui-draft-width',  DEF_DRAFT,  MIN_DRAFT,  Infinity)

  // Compute upper bound for draft: leave room for source + clips + reader minimum + handles
  function maxDraft() {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1400
    return vw - source.width - 1 - clips.width - HANDLE_W - MIN_READER - HANDLE_W
  }

  // Compute upper bound for source: leave room for clips + reader minimum + draft + handles
  function maxSource() {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1400
    return vw - MIN_CLIPS - HANDLE_W - MIN_READER - HANDLE_W - draft.width - 1
  }

  // Compute upper bound for clips: leave room for reader minimum
  function maxClips() {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1400
    return vw - source.width - 1 - HANDLE_W - MIN_READER - HANDLE_W - draft.width
  }

  if (!mounted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#080808' }}>
        <ProjectBar />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#080808' }}>
      <ProjectBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <SourcePanel width={source.width} />

        <ResizeHandle
          dragging={source.dragging}
          onMouseDown={e => source.startDrag(e, 'ltr', maxSource)}
        />

        <ReaderPanel clipsWidth={clips.width} onClipsDragStart={(e) => clips.startDrag(e, 'ltr', maxClips)} />

        <ResizeHandle
          dragging={draft.dragging}
          onMouseDown={e => draft.startDrag(e, 'rtl', maxDraft)}
        />

        <DraftPanel width={draft.width} />

      </div>
      <ProjectsModal />
      <SourceContextMenu />
    </div>
  )
}

export default function AppPage() {
  return (
    <AppProvider>
      <Layout />
      <StorageWarning />
    </AppProvider>
  )
}
