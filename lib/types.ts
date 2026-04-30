export type SourceStatus = 'queued' | 'loading' | 'done' | 'error'

export interface AnalysisResult {
  title: string
  parties: string[]
  date: string | null
  sections: Array<{ number: string; title: string }>
  keywords: string[]   // fallback for docs without clear sections
}

export interface SpanEntry {
  text: string       // full span text content
  start?: number     // char offset where highlight starts within this span
  end?: number       // char offset where highlight ends (undefined = to end)
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
  result: AnalysisResult | null
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
