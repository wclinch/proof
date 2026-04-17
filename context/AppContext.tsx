'use client'
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Project, QueuedSource } from '@/lib/types'
import {
  ACTIVE_KEY, SELECTED_KEY,
  uid, getSessionId, newProject,
  loadProjects, saveProjects,
  PDF_FREE_LIMIT,
} from '@/lib/storage'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

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
  // auth
  user: User | null
  isSubscribed: boolean
  pdfCount: number
  showPaywall: boolean
  setShowPaywall: (v: boolean) => void
  // setters exposed for local use in components
  setShowProjects: (v: boolean | ((prev: boolean) => boolean)) => void
  setSelectedId: (id: string | null) => void
  setSelectedIds: (ids: Set<string>) => void
  setAnchorId: (id: string | null) => void
  setCenterView: (v: 'analysis' | 'source') => void
  setContextMenu: (m: ContextMenu | null) => void
  setProjContextMenu: (m: ProjContextMenu | null) => void
  isAnalyzing: boolean
  isUploadingFile: boolean
  // actions
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  updateProject: (id: string, patch: Partial<Project>) => void
  patchSource: (projId: string, srcId: string, patch: Partial<QueuedSource>) => void
  uploadFiles: (files: FileList | File[]) => Promise<void>
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

  const [user, setUser]               = useState<User | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const isSubscribedRef               = useRef(false)

  const analyzing         = useRef(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

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

  // Auth listener
  useEffect(() => {
    const sb = getSupabaseBrowser()
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) checkSubscription(session.user.id)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) checkSubscription(session.user.id)
      else { setIsSubscribed(false); isSubscribedRef.current = false }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function checkSubscription(userId: string) {
    const sb = getSupabaseBrowser()
    const { data } = await (sb.from as any)('profiles').select('subscribed').eq('id', userId).single() as { data: { subscribed: boolean } | null }
    const sub = data?.subscribed ?? false
    setIsSubscribed(sub)
    isSubscribedRef.current = sub
  }

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

  // Count non-error sources across ALL projects — used for free tier cap
  const pdfCount = projects.reduce(
    (acc, p) => acc + p.sources.filter(s => s.status !== 'error').length, 0
  )

  // Auto-dismiss paywall when sources are removed and count drops below limit
  useEffect(() => {
    if (!isSubscribedRef.current && pdfCount < PDF_FREE_LIMIT) setShowPaywall(false)
  }, [pdfCount])

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

  async function uploadFiles(files: FileList | File[]) {
    if (!activeId || analyzing.current) return
    let list = Array.from(files).filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    ).slice(0, MAX_BATCH)
    if (!list.length) return

    // Source cap for free users — based on current live count
    if (!isSubscribedRef.current) {
      const remaining = Math.max(0, PDF_FREE_LIMIT - pdfCount)
      if (remaining === 0) { setShowPaywall(true); return }
      if (list.length > remaining) list = list.slice(0, remaining)
    }

    const newSources: QueuedSource[] = list.map(f => ({
      id: uid(), raw: `file:${f.name}`, status: 'queued',
      result: null, rawText: null, error: null, label: f.name,
    }))

    updateProject(activeId, { sources: [...sources, ...newSources] })
    setSelectedId(newSources[0].id)
    analyzing.current = true
    setIsAnalyzing(true)
    setIsUploadingFile(true)

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
    setIsUploadingFile(false)
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
    activeProject, sources, selectedSource, isAnalyzing, isUploadingFile,
    user, isSubscribed, pdfCount, showPaywall, setShowPaywall,
    setShowProjects, setSelectedId, setSelectedIds, setAnchorId,
    setCenterView, setContextMenu, setProjContextMenu,
    setProjects, updateProject, patchSource,
    uploadFiles,
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
