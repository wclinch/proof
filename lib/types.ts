export type SourceStatus = 'queued' | 'loading' | 'done' | 'error'

export interface AnalysisResult {
  title: string
  authors: string[]
  year: string | null
  journal: string | null
  doi: string | null
  type: string
  abstract: string | null
  sample_n: string | null
  sample_desc: string | null
  methodology: string | null
  stats: string[]
  findings: string[]
  conclusions: string[]
  quotes: string[]
  limitations: string[]
  concepts: string[]
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
  citations: string[]                        // ordered source IDs added to the citations tray
  citationStyle: 'mla' | 'apa' | 'chicago'  // active citation format
}
