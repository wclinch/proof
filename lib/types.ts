type SourceStatus = 'queued' | 'done' | 'error'

export interface HighlightRect {
  x: number  // fraction of page width
  y: number  // fraction of page height
  w: number  // fraction of page width
  h: number  // fraction of page height
}

export interface Highlight {
  id: string
  text: string
  page: number
  rects: HighlightRect[]
  createdAt: number
}

export interface QueuedSource {
  id: string
  raw: string
  status: SourceStatus
  error: string | null
  label?: string
  highlights?: Highlight[]
}

export interface Project {
  id: string
  name: string
  sources: QueuedSource[]
  draft: string
  draftTitle: string
}
