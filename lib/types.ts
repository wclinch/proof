type SourceStatus = 'queued' | 'done' | 'error'

export interface SpanEntry {
  text: string
  start?: number
  end?: number
}

export interface Highlight {
  id: string
  text: string
  page: number
  spans: SpanEntry[]
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
  draftCreated: boolean
}
