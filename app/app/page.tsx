'use client'
import { AppProvider } from '@/context/AppContext'
import ProjectBar        from '@/components/ProjectBar'
import SourcePanel       from '@/components/SourcePanel'
import AnalysisPanel     from '@/components/AnalysisPanel'
import DraftPanel        from '@/components/DraftPanel'
import ProjectsModal     from '@/components/ProjectsModal'
import SourceContextMenu from '@/components/SourceContextMenu'
import { useApp }        from '@/context/AppContext'
import { useState, useRef, useEffect } from 'react'

const SOURCE_WIDTH = 260

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

function Layout() {
  const { mounted } = useApp()
  const [draftWidth, setDraftWidth] = useState(() => {
    if (typeof window === 'undefined') return 460
    const saved = parseInt(localStorage.getItem('proof-ui-draft-width') || '0', 10)
    return Math.max(300, saved || 460)
  })
  const draftWidthRef = useRef(draftWidth)
  const MIN_MIDDLE = 300  // center panel never collapses below this
  const MIN_DRAFT  = 300

  function startDrag(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = draftWidthRef.current

    function onMove(ev: MouseEvent) {
      if (ev.buttons === 0) { onUp(); return }
      const delta = ev.clientX - startX
      // Allow draft panel to grow until only MIN_MIDDLE remains for center
      const maxW = Math.max(MIN_DRAFT, window.innerWidth - SOURCE_WIDTH - MIN_MIDDLE)
      const w = Math.max(MIN_DRAFT, Math.min(maxW, startW - delta))
      draftWidthRef.current = w
      setDraftWidth(w)
      localStorage.setItem('proof-ui-draft-width', String(w))
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
        <SourcePanel width={SOURCE_WIDTH} />
        <div style={{ width: '1px', flexShrink: 0, background: '#1a1a1a' }} />
        <AnalysisPanel />
        <ResizeHandle onMouseDown={startDrag} />
        <DraftPanel width={draftWidth} />
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
