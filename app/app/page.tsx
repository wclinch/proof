'use client'
import { AppProvider } from '@/context/AppContext'
import Nav               from '@/components/Nav'
import ProjectBar        from '@/components/ProjectBar'
import SourcePanel       from '@/components/SourcePanel'
import AnalysisPanel     from '@/components/AnalysisPanel'
import DraftPanel        from '@/components/DraftPanel'
import ProjectsModal     from '@/components/ProjectsModal'
import SourceContextMenu from '@/components/SourceContextMenu'
import { useApp }        from '@/context/AppContext'
import { useState, useRef } from 'react'

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
  const [sourceWidth, setSourceWidth] = useState(() => {
    if (typeof window === 'undefined') return 260
    return parseInt(localStorage.getItem('proof-ui-source-width') || '260', 10)
  })
  const [draftWidth, setDraftWidth] = useState(() => {
    if (typeof window === 'undefined') return 420
    return parseInt(localStorage.getItem('proof-ui-draft-width') || '420', 10)
  })
  const sourceWidthRef = useRef(sourceWidth)
  const draftWidthRef  = useRef(draftWidth)

  function startDrag(side: 'left' | 'right', e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = side === 'left' ? sourceWidthRef.current : draftWidthRef.current

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startX
      if (side === 'left') {
        const w = Math.max(24, Math.min(700, startW + delta))
        sourceWidthRef.current = w
        setSourceWidth(w)
        localStorage.setItem('proof-ui-source-width', String(w))
      } else {
        const w = Math.max(24, Math.min(900, startW - delta))
        draftWidthRef.current = w
        setDraftWidth(w)
        localStorage.setItem('proof-ui-draft-width', String(w))
      }
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
        <Nav />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#080808' }}>
      <Nav />
      <ProjectBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SourcePanel width={sourceWidth} />
        <ResizeHandle onMouseDown={e => startDrag('left', e)} />
        <AnalysisPanel />
        <ResizeHandle onMouseDown={e => startDrag('right', e)} />
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
    </AppProvider>
  )
}
