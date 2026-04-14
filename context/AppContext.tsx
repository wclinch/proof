'use client'
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import type { Project, QueuedSource } from '@/lib/types'
import {
  ACTIVE_KEY, SELECTED_KEY,
  uid, getSessionId, newProject,
  loadProjects, saveProjects, parseInput,
} from '@/lib/storage'

interface ContextMenu    { srcId: string;  x: number; y: number }
interface ProjContextMenu { projId: string; x: number; y: number }

interface AppState {
  mounted: boolean
  projects: Project[]
  activeId: string | null
  selectedId: string | null
  selectedIds: Set<string>
  anchorId: string | null
  showProjects: boolean
  centerView: 'analysis' | 'source'
  highlightText: string | null
  contextMenu: ContextMenu | null
  projContextMenu: ProjContextMenu | null
  // derived
  activeProject: Project | null
  sources: QueuedSource[]
  selectedSource: QueuedSource | null
  // setters exposed for local use in components
  setShowProjects: (v: boolean | ((prev: boolean) => boolean)) => void
  setSelectedId: (id: string | null) => void
  setSelectedIds: (ids: Set<string>) => void
  setAnchorId: (id: string | null) => void
  setCenterView: (v: 'analysis' | 'source') => void
  setContextMenu: (m: ContextMenu | null) => void
  setProjContextMenu: (m: ProjContextMenu | null) => void
  isAnalyzing: boolean
  // actions
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  updateProject: (id: string, patch: Partial<Project>) => void
  patchSource: (projId: string, srcId: string, patch: Partial<QueuedSource>) => void
  analyzeSources: (inputText: string) => Promise<void>
  uploadFiles: (files: FileList | File[]) => Promise<void>
  reanalyzeSource: (srcId: string) => Promise<void>
  isOnCooldown: (srcId: string) => boolean
  addCitation: (srcId: string) => void
  removeCitation: (srcId: string) => void
  removeSource: (srcId: string) => void
  removeSelected: () => void
  createProject: () => void
  switchProject: (id: string) => void
  deleteProject: (id: string) => void
  jumpToSource: (text: string) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted]           = useState(false)
  const [projects, setProjects]         = useState<Project[]>([])
  const [activeId, setActiveId]         = useState<string | null>(null)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [anchorId, setAnchorId]         = useState<string | null>(null)
  const [showProjects, setShowProjects] = useState(false)
  const [centerView, setCenterView]     = useState<'analysis' | 'source'>('analysis')
  const [highlightText, setHighlightText] = useState<string | null>(null)
  const [contextMenu, setContextMenu]     = useState<ContextMenu | null>(null)
  const [projContextMenu, setProjContextMenu] = useState<ProjContextMenu | null>(null)

  const analyzing         = useRef(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const reanalyzeCooldown = useRef<Set<string>>(new Set())

  // Escape closes all modals and menus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProjects(false)
        setProjContextMenu(null)
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Outside click dismisses source context menu
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  // Outside click dismisses project context menu
  useEffect(() => {
    if (!projContextMenu) return
    const handler = () => setProjContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [projContextMenu])

  // Reset center view + highlight when switching selected source
  useEffect(() => {
    setCenterView('analysis')
    setHighlightText(null)
  }, [selectedId])

  // Reset multi-selection when switching projects
  useEffect(() => {
    setSelectedIds(new Set())
    setAnchorId(null)
  }, [activeId])

  // Reset project context menu when projects modal opens/closes
  useEffect(() => {
    setProjContextMenu(null)
  }, [showProjects])

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const saved = loadProjects()
    if (saved.length) {
      setProjects(saved)
      const savedActive = localStorage.getItem(ACTIVE_KEY)
      const match = saved.find(p => p.id === savedActive) ?? saved[0]
      setActiveId(match.id)
      const savedSelected = localStorage.getItem(SELECTED_KEY)
      if (savedSelected && match.sources.find(s => s.id === savedSelected)) {
        setSelectedId(savedSelected)
      }
    } else {
      const p = newProject(1)
      setProjects([p])
      setActiveId(p.id)
    }
    setMounted(true)
  }, [])

  useEffect(() => { if (projects.length) saveProjects(projects) }, [projects])
  useEffect(() => { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId) }, [activeId])
  useEffect(() => {
    if (selectedId) localStorage.setItem(SELECTED_KEY, selectedId)
    else localStorage.removeItem(SELECTED_KEY)
  }, [selectedId])

  // ─── Derived ────────────────────────────────────────────────────────────────

  const activeProject  = projects.find(p => p.id === activeId) ?? null
  const sources        = activeProject?.sources ?? []
  const selectedSource = sources.find(s => s.id === selectedId) ?? null

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function updateProject(id: string, patch: Partial<Project>) {
    setProjects(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  function patchSource(projId: string, srcId: string, patch: Partial<QueuedSource>) {
    setProjects(ps => ps.map(p =>
      p.id !== projId ? p : {
        ...p,
        sources: p.sources.map(s => s.id === srcId ? { ...s, ...patch } : s),
      }
    ))
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  const MAX_BATCH = 10
  const MAX_FILE_MB = 20

  async function analyzeSources(inputText: string) {
    if (!activeId || !inputText.trim() || analyzing.current) return
    const parsed = parseInput(inputText)
    if (!parsed.length) return

    // Deduplicate against sources already in the project
    const existingRaws = new Set(sources.map(s => s.raw))
    const fresh = parsed.filter(u => !existingRaws.has(u))
    if (!fresh.length) return

    // Cap batch size
    const urls = fresh.slice(0, MAX_BATCH)

    const newSources: QueuedSource[] = urls.map(raw => ({
      id: uid(), raw, status: 'queued', result: null, rawText: null, error: null,
    }))

    updateProject(activeId, { sources: [...sources, ...newSources] })
    setSelectedId(newSources[0].id)
    analyzing.current = true
    setIsAnalyzing(true)

    const projId      = activeId
    for (const src of newSources) {
      patchSource(projId, src.id, { status: 'loading' })
      try {
        const res = await fetch('/api/analyze', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: src.raw, session_id: getSessionId() }),
        })
        const data = await res.json() as { error?: string; analysis?: unknown; content?: string }
        if (data.error) {
          patchSource(projId, src.id, { status: 'error', error: data.error })
        } else {
          patchSource(projId, src.id, { status: 'done', result: data.analysis as QueuedSource['result'], rawText: data.content ?? null })
        }
      } catch {
        patchSource(projId, src.id, { status: 'error', error: 'Network error — check your connection' })
      }
    }
    analyzing.current = false
    setIsAnalyzing(false)
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!activeId || analyzing.current) return
    const list = Array.from(files).filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') ||
      f.type === 'text/plain'      || f.name.toLowerCase().endsWith('.txt')
    ).slice(0, MAX_BATCH)
    if (!list.length) return

    const newSources: QueuedSource[] = list.map(f => ({
      id: uid(), raw: `file:${f.name}`, status: 'queued',
      result: null, rawText: null, error: null, label: f.name,
    }))

    updateProject(activeId, { sources: [...sources, ...newSources] })
    setSelectedId(newSources[0].id)
    analyzing.current = true
    setIsAnalyzing(true)

    const projId     = activeId
    for (let i = 0; i < list.length; i++) {
      const file = list[i]
      const src  = newSources[i]

      // Client-side file size guard
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        patchSource(projId, src.id, { status: 'error', error: `File too large (max ${MAX_FILE_MB}MB)` })
        continue
      }

      patchSource(projId, src.id, { status: 'loading' })
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('session_id', getSessionId())
        const res  = await fetch('/api/upload', { method: 'POST', body: form })
        const data = await res.json() as { error?: string; analysis?: unknown; content?: string }
        if (data.error) {
          patchSource(projId, src.id, { status: 'error', error: data.error })
        } else {
          patchSource(projId, src.id, { status: 'done', result: data.analysis as QueuedSource['result'], rawText: data.content ?? null })
        }
      } catch {
        patchSource(projId, src.id, { status: 'error', error: 'Upload failed — check your connection' })
      }
    }
    analyzing.current = false
    setIsAnalyzing(false)
  }

  async function reanalyzeSource(srcId: string) {
    if (!activeId) return
    const src = sources.find(s => s.id === srcId)
    if (!src || src.raw.startsWith('file:')) return
    if (reanalyzeCooldown.current.has(srcId)) return
    reanalyzeCooldown.current.add(srcId)
    setTimeout(() => reanalyzeCooldown.current.delete(srcId), 30000)
    const projId     = activeId
    patchSource(projId, srcId, { status: 'loading', error: null })
    try {
      const res  = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: src.raw, session_id: getSessionId() }),
      })
      const data = await res.json() as { error?: string; analysis?: unknown; content?: string }
      if (data.error) {
        patchSource(projId, srcId, { status: 'error', error: data.error })
      } else {
        patchSource(projId, srcId, { status: 'done', result: data.analysis as QueuedSource['result'], rawText: data.content ?? null })
      }
    } catch {
      patchSource(projId, srcId, { status: 'error', error: 'Network error' })
    }
  }

  function isOnCooldown(srcId: string): boolean {
    return reanalyzeCooldown.current.has(srcId)
  }

  function addCitation(srcId: string) {
    if (!activeId) return
    const current = activeProject?.citations ?? []
    if (current.includes(srcId)) return
    updateProject(activeId, { citations: [...current, srcId] })
  }

  function removeCitation(srcId: string) {
    if (!activeId) return
    const current = activeProject?.citations ?? []
    updateProject(activeId, { citations: current.filter(id => id !== srcId) })
  }

  function removeSource(srcId: string) {
    if (!activeId) return
    const updated = sources.filter(s => s.id !== srcId)
    updateProject(activeId, { sources: updated })
    if (selectedId === srcId) setSelectedId(updated[0]?.id ?? null)
    setSelectedIds(new Set())
    setAnchorId(null)
  }

  function removeSelected() {
    if (!activeId || !selectedIds.size) return
    const updated = sources.filter(s => !selectedIds.has(s.id))
    updateProject(activeId, { sources: updated })
    const nextSelected = selectedId && !selectedIds.has(selectedId)
      ? selectedId
      : (updated[0]?.id ?? null)
    setSelectedId(nextSelected)
    setSelectedIds(new Set())
    setAnchorId(null)
  }

  function createProject() {
    const p = newProject(projects.length + 1)
    setProjects(ps => [...ps, p])
    setActiveId(p.id)
    setShowProjects(false)
    setSelectedId(null)
  }

  function switchProject(id: string) {
    setActiveId(id)
    setShowProjects(false)
    setSelectedId(null)
  }

  function deleteProject(id: string) {
    const updated = projects.filter(p => p.id !== id)
    if (!updated.length) {
      const p = newProject(1)
      setProjects([p])
      setActiveId(p.id)
      setShowProjects(false)
    } else {
      setProjects(updated)
      if (activeId === id) setActiveId(updated[0].id)
    }
  }

  function jumpToSource(text: string) {
    setCenterView('source')
    setHighlightText(text)
  }

  // ─── Context value ──────────────────────────────────────────────────────────

  const value: AppState = {
    mounted, projects, activeId, selectedId, selectedIds, anchorId,
    showProjects, centerView, highlightText, contextMenu, projContextMenu,
    activeProject, sources, selectedSource, isAnalyzing,
    setShowProjects, setSelectedId, setSelectedIds, setAnchorId,
    setCenterView, setContextMenu, setProjContextMenu,
    setProjects, updateProject, patchSource,
    analyzeSources, uploadFiles, reanalyzeSource, isOnCooldown,
    addCitation, removeCitation,
    removeSource, removeSelected,
    createProject, switchProject, deleteProject,
    jumpToSource,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
