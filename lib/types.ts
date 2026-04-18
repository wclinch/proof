export type SourceStatus = 'queued' | 'loading' | 'done' | 'error'

export interface AnalysisResult {
  title: string
  parties: string[]
  date: string | null
  sections: Array<{ number: string; title: string }>
  keywords: string[]   // fallback for docs without clear sections
}

export interface QueuedSource {
  id: string
  raw: string
  status: SourceStatus
  result: AnalysisResult | null
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
