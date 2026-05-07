export interface Sentence {
  i: number
  text: string
}

export interface Block {
  sentences: Sentence[]
}

export interface DocContent {
  blocks: Block[]
  // Sentence index (sentence.i) where each PDF page starts (0-indexed pages).
  // pageBreaks[0] = 0 (page 1 starts at sentence 0), pageBreaks[1] = first sentence of page 2, etc.
  pageBreaks: number[]
}

export interface Clip {
  id: string
  sentenceIds: number[]  // sentence.i values in window order
  centreIdx: number      // sentence.i of the clicked sentence
  createdAt: number
}

export interface QueuedSource {
  id: string
  raw: string
  status: 'queued' | 'extracting' | 'done' | 'error'
  error: string | null
  label?: string
  content?: DocContent
  clips: Clip[]
}

export interface Project {
  id: string
  name: string
  sources: QueuedSource[]
  draft: string
  draftTitle: string
}
