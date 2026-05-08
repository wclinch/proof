import type { Project } from './types'

const STORAGE_KEY  = 'proof-v3-projects'
export const ACTIVE_KEY   = 'proof-v3-active'
export const SELECTED_KEY = 'proof-v3-selected'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function newProject(n: number): Project {
  return {
    id: uid(),
    name: `untitled-${n}`,
    sources: [],
    draft: '',
    draftTitle: '',
    fragments: [],
  }
}

export function newSource(raw: string, label?: string): import('./types').QueuedSource {
  return { id: uid(), raw, status: 'queued', error: null, label, clips: [] }
}

export function loadProjects(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? []
  } catch {
    return []
  }
}

export function saveProjects(ps: Project[]) {
  try {
    // Strip extracted content — stored separately in IndexedDB to keep
    // localStorage small and prevent quota failures on large PDFs.
    const stripped = ps.map(p => ({
      ...p,
      sources: p.sources.map(s => ({ ...s, content: undefined })),
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
  } catch {
    window.dispatchEvent(new CustomEvent('proof-storage-warning', {
      detail: 'Storage full — changes may not be saved.',
    }))
  }
}
