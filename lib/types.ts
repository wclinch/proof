export type SourceStatus = 'queued' | 'loading' | 'done' | 'error'

export interface AnalysisResult {
  title: string
  authors: string[]
  year: string | null
  journal: string | null
  facts: string[]
  supporting: string[]
  quotes: string[]
  keywords: string[]
}

export interface QueuedSource {
  id: string
  raw: string
  status: SourceStatus
  result: AnalysisResult | null
  rawText: string | null
  error: string | null
  label?: string
}

export interface Project {
  id: string
  name: string
  sources: QueuedSource[]
  draft: string
  draftTitle: string
  draftCreated: boolean
}
