import type { Project } from './types'

const STORAGE_KEY  = 'proof-v2-projects'
export const ACTIVE_KEY   = 'proof-v2-active'
export const SELECTED_KEY = 'proof-v2-selected'

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
    draftCreated: false,
  }
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ps))
  } catch {
    window.dispatchEvent(new CustomEvent('proof-storage-warning', {
      detail: 'Storage full — changes may not be saved.',
    }))
  }
}
