import type { Project } from './types'

export const STORAGE_KEY  = 'proof-v2-projects'
export const ACTIVE_KEY   = 'proof-v2-active'
export const SELECTED_KEY = 'proof-v2-selected'
export const SESSION_KEY  = 'proof-v2-session'
export const PDF_FREE_LIMIT = 5

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = uid() + uid()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
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
  // Truncate rawText to 20k chars at a word boundary — keeps highlight working
  // while staying well within the 5MB localStorage quota
  const slim = ps.map(p => ({
    ...p,
    sources: p.sources.map(s => ({
      ...s,
      rawText: s.rawText
        ? s.rawText.slice(0, 20000).replace(/\S+$/, '').trimEnd()
        : null,
    })),
  }))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
  } catch {
    // Quota exceeded — retry with rawText stripped entirely
    try {
      const bare = ps.map(p => ({
        ...p,
        sources: p.sources.map(s => ({ ...s, rawText: null })),
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bare))
      window.dispatchEvent(new CustomEvent('proof-storage-warning', {
        detail: 'Storage nearly full — source text cleared to save space.',
      }))
    } catch {
      window.dispatchEvent(new CustomEvent('proof-storage-warning', {
        detail: 'Storage full — changes may not be saved.',
      }))
    }
  }
}
