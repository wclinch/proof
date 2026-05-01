'use client'
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Project, QueuedSource } from '@/lib/types'
import {
  ACTIVE_KEY, SELECTED_KEY,
  uid, newProject,
  loadProjects, saveProjects,
} from '@/lib/storage'
import { loadProjectsCloud, saveProjectsCloud } from '@/lib/sync'
import { storeFile, deleteFile, getFile } from '@/lib/idb'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { capture, identify, reset } from '@/lib/posthog'

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
  contextMenu: ContextMenu | null
  projContextMenu: ProjContextMenu | null
  // derived
  activeProject: Project | null
  sources: QueuedSource[]
  selectedSource: QueuedSource | null
  // auth
  user: User | null
  cloudSyncing: boolean
  // setters exposed for local use in components
  setShowProjects: (v: boolean | ((prev: boolean) => boolean)) => void
  setSelectedId: (id: string | null) => void
  setSelectedIds: (ids: Set<string>) => void
  setAnchorId: (id: string | null) => void
  setContextMenu: (m: ContextMenu | null) => void
  setProjContextMenu: (m: ProjContextMenu | null) => void
  // actions
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  updateProject: (id: string, patch: Partial<Project>) => void
  patchSource: (projId: string, srcId: string, patch: Partial<QueuedSource>) => void
  uploadFiles: (files: FileList | File[]) => Promise<void>
  retrySource: (srcId: string) => Promise<void>
  removeSource: (srcId: string) => void
  removeSelected: () => void
  createProject: () => void
  switchProject: (id: string) => void
  deleteProject: (id: string) => void
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
  const [contextMenu, setContextMenu]     = useState<ContextMenu | null>(null)
  const [projContextMenu, setProjContextMenu] = useState<ProjContextMenu | null>(null)

  const [user, setUser] = useState<User | null>(null)

  const userIdRef      = useRef<string | null>(null)
  const saveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cloudReady     = useRef(false)
  const [cloudSyncing, setCloudSyncing] = useState(false)

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
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        identify(session.user.id, { email: session.user.email })
        capture('app_opened')
      } else {
        reset()
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Keep userIdRef current so the debounced save can read it without stale closure
  useEffect(() => { userIdRef.current = user?.id ?? null }, [user])

  // Load from cloud when signed in, replacing local state
  useEffect(() => {
    if (!mounted || !user) { cloudReady.current = false; return }
    cloudReady.current = false
    loadProjectsCloud(user.id).then(cloud => {
      if (cloud && cloud.length > 0) {
        setProjects(cloud)
        const savedActive = localStorage.getItem(ACTIVE_KEY)
        const match = cloud.find(p => p.id === savedActive) ?? cloud[0]
        setActiveId(match.id)
        const savedSelected = localStorage.getItem(SELECTED_KEY)
        if (savedSelected && match.sources.find((s: { id: string }) => s.id === savedSelected)) {
          setSelectedId(savedSelected)
        }
      }
      cloudReady.current = true
    }).catch(() => { cloudReady.current = true })
  }, [mounted, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Always persist to localStorage (fast cache / fallback for signed-out users)
  useEffect(() => { if (projects.length) saveProjects(projects) }, [projects])

  // Debounced cloud save — only fires when signed in and after initial cloud load
  useEffect(() => {
    if (!cloudReady.current || !userIdRef.current || !projects.length) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setCloudSyncing(true)
    saveTimerRef.current = setTimeout(async () => {
      if (userIdRef.current) await saveProjectsCloud(userIdRef.current, projects)
      setCloudSyncing(false)
    }, 2000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [projects])

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

  async function uploadFiles(files: FileList | File[]) {
    if (!activeId) return
    let list = Array.from(files).filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    ).slice(0, MAX_BATCH)
    // Deduplicate: skip files already in the current project
    list = list.filter(f => !sources.some(s => s.label === f.name))
    if (!list.length) return

    const newSources: QueuedSource[] = list.map(f => ({
      id: uid(), raw: `file:${f.name}`, status: 'queued',
      error: null, label: f.name,
    }))

    updateProject(activeId, { sources: [...sources, ...newSources] })
    setSelectedId(newSources[0].id)
    setSelectedIds(new Set([newSources[0].id]))
    setAnchorId(newSources[0].id)

    const projId = activeId
    for (let i = 0; i < list.length; i++) {
      const file = list[i]
      const src  = newSources[i]

      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        patchSource(projId, src.id, { status: 'error', error: `File too large (max ${MAX_FILE_MB}MB)` })
        continue
      }

      try {
        await storeFile(src.id, file)
        patchSource(projId, src.id, { status: 'done' })
        capture('upload_complete')
      } catch {
        patchSource(projId, src.id, { status: 'error', error: 'Failed to store file — try again.' })
      }
    }
  }

  async function retrySource(srcId: string) {
    if (!activeId) return
    const file = await getFile(srcId)
    if (!file) {
      patchSource(activeId, srcId, { status: 'error', error: 'File not found — re-upload to retry.' })
      return
    }
    try {
      await storeFile(srcId, file)
      patchSource(activeId, srcId, { status: 'done', error: null })
    } catch {
      patchSource(activeId, srcId, { status: 'error', error: 'Failed to store file — try again.' })
    }
  }

  function removeSource(srcId: string) {
    if (!activeId) return
    const updated = sources.filter(s => s.id !== srcId)
    updateProject(activeId, { sources: updated })
    if (selectedId === srcId) setSelectedId(updated[0]?.id ?? null)
    setSelectedIds(new Set())
    setAnchorId(null)
    deleteFile(srcId).catch(() => {})
  }

  function removeSelected() {
    if (!activeId || !selectedIds.size) return
    const updated = sources.filter(s => !selectedIds.has(s.id))
    updateProject(activeId, { sources: updated })
    const nextSelected = selectedId && !selectedIds.has(selectedId)
      ? selectedId
      : (updated[0]?.id ?? null)
    setSelectedId(nextSelected)
    selectedIds.forEach(id => deleteFile(id).catch(() => {}))
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

  // ─── Context value ──────────────────────────────────────────────────────────

  const value: AppState = {
    mounted, projects, activeId, selectedId, selectedIds, anchorId,
    showProjects, contextMenu, projContextMenu,
    activeProject, sources, selectedSource,
    user, cloudSyncing,
    setShowProjects, setSelectedId, setSelectedIds, setAnchorId,
    setContextMenu, setProjContextMenu,
    setProjects, updateProject, patchSource,
    uploadFiles, retrySource,
    removeSource, removeSelected,
    createProject, switchProject, deleteProject,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
