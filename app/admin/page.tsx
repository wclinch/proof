'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type DBSource = {
  id: string
  title: string
  url: string
  topic: string
  citation_count: number
  author: string | null
  published_date: string | null
}

type Suggestion = {
  id: string
  url: string
  suggested_title: string
  query: string
  note: string | null
  suggestion_count: number
  user_id: string | null
  created_at: string
}

type IngestResult = {
  title: string
  url: string
  author: string
  journal: string
  year: number | null
  citations: number
}

type OAWork = {
  title: string
  authorships: Array<{ author: { display_name: string } }>
  primary_location: { source?: { display_name: string }; landing_page_url?: string } | null
  publication_year: number
  cited_by_count: number
  open_access: { oa_url?: string }
}

type CRWork = {
  title: string[]
  author?: Array<{ given?: string; family?: string }>
  'container-title'?: string[]
  published?: { 'date-parts': number[][] }
  'is-referenced-by-count': number
  URL: string
  DOI: string
  type: string
}

type IngestSource = 'openalex' | 'crossref' | 'manual'

type OAFilters = {
  topic: string
  searchMode: 'title' | 'fulltext'
  type: '' | 'article' | 'review' | 'book-chapter'
  journal: string
  minCitations: number
  fromYear: number
  toYear: number
  perPage: number
  openAccess: boolean
  sort: 'cited_by_count:desc' | 'relevance_score:desc' | 'publication_year:desc'
}

type CRFilters = {
  query: string
  searchMode: 'bibliographic' | 'title'
  type: '' | 'journal-article' | 'book' | 'book-chapter' | 'proceedings-article'
  fromYear: number
  toYear: number
  minCitations: number
  perPage: number
  sort: 'relevance' | 'is-referenced-by-count' | 'published'
}

type ManualForm = {
  title: string
  url: string
  topic: string
  author: string
  year: string
  citations: string
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: '#111', border: '1px solid #1e1e1e', borderRadius: '6px',
  padding: '14px 16px', color: '#f0f0f0', fontSize: '14px', outline: 'none',
  width: '100%', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase',
}

const ghostBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#2a2a2a', fontSize: '11px',
  cursor: 'pointer', letterSpacing: '0.04em', padding: 0, transition: 'color 0.15s',
}

// ─── Generic Select Dropdown ─────────────────────────────────────────────────

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: '#111', border: '1px solid #1e1e1e',
          borderRadius: '6px', padding: '14px 16px', color: '#f0f0f0',
          fontSize: '14px', outline: 'none', cursor: 'pointer', textAlign: 'left',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'inherit',
        }}
      >
        <span>{selected?.label}</span>
        <span style={{ color: '#333', fontSize: '10px' }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#111', border: '1px solid #1e1e1e', borderRadius: '6px',
          zIndex: 10, overflow: 'hidden',
        }}>
          {options.map(o => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                padding: '12px 16px', fontSize: '14px', cursor: 'pointer',
                color: o.value === value ? '#f0f0f0' : '#444',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
          background: value ? '#444' : '#1a1a1a',
          border: `1px solid ${value ? '#555' : '#222'}`,
          position: 'relative', cursor: 'pointer', transition: 'background 0.15s', padding: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: '2px',
          left: value ? '16px' : '2px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: value ? '#e8e8e8' : '#333',
          transition: 'left 0.15s',
        }} />
      </button>
      <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

// ─── Results list (shared between OA and CrossRef) ────────────────────────────

function ResultsList({
  results, selected, toggle, toggleAll, inserting, onInsert, status, topic,
}: {
  results: IngestResult[]
  selected: Set<number>
  toggle: (i: number) => void
  toggleAll: () => void
  inserting: boolean
  onInsert: () => void
  status: string
  topic: string
}) {
  if (!results.length && !status) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', borderBottom: '1px solid #1a1a1a',
      }}>
        <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.06em' }}>
          {results.length} results — {selected.size} selected{topic ? ` — topic: ${topic}` : ''}
        </span>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={toggleAll}
            style={ghostBtn}
            onMouseEnter={e => (e.currentTarget.style.color = '#888')}
            onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
          >
            {selected.size === results.length ? 'Deselect all' : 'Select all'}
          </button>
          <button
            onClick={onInsert}
            disabled={!selected.size || inserting}
            style={{
              background: selected.size ? '#f0f0f0' : 'none',
              color: selected.size ? '#0a0a0a' : '#2a2a2a',
              border: selected.size ? 'none' : '1px solid #1e1e1e',
              borderRadius: '6px', padding: '8px 18px',
              fontSize: '11px', fontWeight: 600,
              cursor: selected.size ? 'pointer' : 'default',
              letterSpacing: '0.04em', opacity: inserting ? 0.5 : 1,
            }}
          >
            {inserting ? 'Inserting...' : `Insert ${selected.size}`}
          </button>
        </div>
      </div>

      {status && (
        <div style={{ padding: '12px 0', fontSize: '12px', color: '#555', letterSpacing: '0.04em' }}>
          {status}
        </div>
      )}

      {results.map((r, i) => {
        const isSelected = selected.has(i)
        const meta = [r.author, r.journal, r.year].filter(Boolean).join(' · ')
        return (
          <div
            key={i}
            onClick={() => toggle(i)}
            style={{
              display: 'flex', gap: '16px', alignItems: 'center',
              padding: '11px 0', borderBottom: '1px solid #141414',
              cursor: 'pointer', opacity: r.url ? 1 : 0.3,
            }}
          >
            <div style={{
              width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
              border: `1px solid ${isSelected ? '#444' : '#1e1e1e'}`,
              background: isSelected ? '#333' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.1s',
            }}>
              {isSelected && <span style={{ fontSize: '9px', color: '#e8e8e8', lineHeight: 1 }}>✓</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#e8e8e8')}
              >
                {r.title}
              </a>
              {meta && <span style={{ fontSize: '11px', color: '#2a2a2a' }}>{meta}</span>}
            </div>
            <span style={{ fontSize: '10px', color: '#222', flexShrink: 0, letterSpacing: '0.04em' }}>
              {r.citations.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Suggestions Tab ──────────────────────────────────────────────────────────

function SuggestionsTab({ pass }: { pass: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>({})
  const [workingIds, setWorkingIds] = useState<Set<string>>(new Set())
  const [actionError, setActionError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass }),
    })
    const data = await res.json()
    if (data.ok) setSuggestions(data.data)
    else setError(data.message)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function approve(s: Suggestion) {
    const topic = (topicInputs[s.id] ?? s.query).trim()
    if (!topic) return
    setActionError('')
    setWorkingIds(prev => new Set(prev).add(s.id))
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass, id: s.id, url: s.url, title: s.suggested_title, topic, userId: s.user_id }),
    })
    const data = await res.json()
    if (data.ok) { setSuggestions(prev => prev.filter(x => x.id !== s.id)); setApprovingId(null) }
    else setActionError(data.message ?? 'Approve failed. Try again.')
    setWorkingIds(prev => { const n = new Set(prev); n.delete(s.id); return n })
  }

  async function dismiss(id: string) {
    if (!confirm('Dismiss this suggestion? This cannot be undone.')) return
    setActionError('')
    setWorkingIds(prev => new Set(prev).add(id))
    const res = await fetch('/api/admin/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass, id }),
    })
    const data = await res.json()
    if (data.ok) setSuggestions(prev => prev.filter(x => x.id !== id))
    else setActionError('Dismiss failed. Try again.')
    setWorkingIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#2a2a2a' }}>{loading ? '' : `${suggestions.length} pending`}</span>
        <button style={ghostBtn} onClick={load} onMouseEnter={e => (e.currentTarget.style.color = '#888')} onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}>Refresh</button>
      </div>
      {error && <div style={{ padding: '20px 0', fontSize: '13px', color: '#555' }}>{error}</div>}
      {actionError && <div style={{ padding: '8px 0', fontSize: '12px', color: '#555', letterSpacing: '0.04em' }}>{actionError}</div>}
      {loading && <div style={{ padding: '40px 0', fontSize: '13px', color: '#2a2a2a', letterSpacing: '0.04em' }}>Loading...</div>}
      {!loading && !error && suggestions.length === 0 && (
        <div style={{ padding: '40px 0', fontSize: '13px', color: '#2a2a2a', letterSpacing: '0.04em' }}>No pending suggestions.</div>
      )}
      {suggestions.map(s => (
        <div key={s.id} style={{ padding: '16px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px', opacity: workingIds.has(s.id) ? 0.4 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <a href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#e8e8e8')}
              >{s.suggested_title}</a>
              <span style={{ fontSize: '11px', color: '#2a2a2a' }}>
                Query: {s.query}{s.suggestion_count > 1 ? ` · ${s.suggestion_count}×` : ''}{s.user_id ? ' · has account' : ''}
              </span>
              {s.note && <span style={{ fontSize: '11px', color: '#444', fontStyle: 'italic' }}>{s.note}</span>}
            </div>
            <div style={{ display: 'flex', gap: '16px', flexShrink: 0, alignItems: 'center' }}>
              <button style={ghostBtn} onClick={() => setApprovingId(approvingId === s.id ? null : s.id)}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')} onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}>
                {approvingId === s.id ? 'Cancel' : 'Approve'}
              </button>
              <button style={ghostBtn} onClick={() => dismiss(s.id)}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')} onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}>
                Dismiss
              </button>
            </div>
          </div>
          {approvingId === s.id && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                value={topicInputs[s.id] ?? s.query}
                onChange={e => setTopicInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && approve(s)}
                placeholder="Topic..."
                style={{ flex: 1, background: '#111', border: '1px solid #1e1e1e', borderRadius: '5px', padding: '9px 12px', color: '#f0f0f0', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={() => approve(s)}
                style={{ background: '#f0f0f0', color: '#0a0a0a', border: 'none', borderRadius: '5px', fontSize: '12px', fontWeight: 600, padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.04em', flexShrink: 0 }}>
                Confirm
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Sources Tab ──────────────────────────────────────────────────────────────

function SourcesTab({ pass }: { pass: string }) {
  const [sources, setSources] = useState<DBSource[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass }),
    })
    const data = await res.json()
    if (data.ok) setSources(data.data)
    else setError(data.message)
    setLoading(false)
  }, [pass])

  useEffect(() => { load() }, [load])

  async function remove(id: string, title: string) {
    if (!confirm(`Remove "${title}"?`)) return
    setDeletingIds(prev => new Set(prev).add(id))
    const res = await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pass }),
    })
    const data = await res.json()
    if (data.ok) setSources(prev => prev.filter(s => s.id !== id))
    setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const filtered = filter.trim()
    ? sources.filter(s => s.title.toLowerCase().includes(filter.toLowerCase()) || s.topic.toLowerCase().includes(filter.toLowerCase()))
    : sources

  const byTopic = filtered.reduce<Record<string, DBSource[]>>((acc, s) => {
    acc[s.topic] = acc[s.topic] ?? []
    acc[s.topic].push(s)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by title or topic..."
          style={{ background: 'none', border: 'none', outline: 'none', color: '#888', fontSize: '13px', flex: 1 }} />
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: '#2a2a2a' }}>{loading ? '' : `${sources.length} sources`}</span>
          <button style={ghostBtn} onClick={load} onMouseEnter={e => (e.currentTarget.style.color = '#888')} onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}>Refresh</button>
        </div>
      </div>
      {error && <div style={{ padding: '20px 0', fontSize: '13px', color: '#555' }}>{error}</div>}
      {loading && <div style={{ padding: '40px 0', fontSize: '13px', color: '#2a2a2a', letterSpacing: '0.04em' }}>Loading...</div>}
      {!loading && !error && sources.length === 0 && (
        <div style={{ padding: '40px 0', fontSize: '13px', color: '#2a2a2a', letterSpacing: '0.04em' }}>No sources in the database yet.</div>
      )}
      {!loading && Object.entries(byTopic).map(([topic, items]) => (
        <div key={topic}>
          <div style={{ padding: '16px 0 8px', fontSize: '10px', color: '#2a2a2a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {topic} — {items.length}
          </div>
          {items.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: '10px 0', borderBottom: '1px solid #111' }}>
              <a href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#e8e8e8')}
              >{s.title}</a>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', color: '#222' }}>{s.citation_count.toLocaleString()}</span>
                <button onClick={() => remove(s.id, s.title)} disabled={deletingIds.has(s.id)}
                  style={{ ...ghostBtn, opacity: deletingIds.has(s.id) ? 0.4 : 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#888')} onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Main Admin Component ─────────────────────────────────────────────────────

export default function Admin() {
  const [pass, setPass] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [tab, setTab] = useState<'ingest' | 'sources' | 'suggestions'>('ingest')

  // Ingest source switcher
  const [ingestSource, setIngestSource] = useState<IngestSource>('openalex')

  // OpenAlex filters
  const [oaFilters, setOA] = useState<OAFilters>({
    topic: '', searchMode: 'title', type: '', journal: '',
    minCitations: 50, fromYear: 2005, toYear: new Date().getFullYear(),
    perPage: 30, openAccess: true, sort: 'cited_by_count:desc',
  })

  // CrossRef filters
  const [crFilters, setCR] = useState<CRFilters>({
    query: '', searchMode: 'bibliographic', type: 'journal-article',
    fromYear: 2005, toYear: new Date().getFullYear(),
    minCitations: 0, perPage: 25, sort: 'is-referenced-by-count',
  })

  // Manual form
  const [manual, setManual] = useState<ManualForm>({ title: '', url: '', topic: '', author: '', year: '', citations: '' })
  const [manualStatus, setManualStatus] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  // Results (shared)
  const [results, setResults] = useState<IngestResult[]>([])
  const [resultTopic, setResultTopic] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [status, setStatus] = useState('')

  async function checkPass() {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass }),
    })
    if (res.ok) setAuthed(true)
    else setAuthError(true)
  }

  function toggle(i: number) {
    setSelected(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })
  }

  function toggleAll() {
    setSelected(selected.size === results.length ? new Set() : new Set(results.map((_, i) => i)))
  }

  // ── OpenAlex search ──────────────────────────────────────────────────────────
  async function searchOA() {
    if (!oaFilters.topic.trim()) return
    setLoading(true); setResults([]); setSelected(new Set()); setStatus(''); setFetched(false)
    setResultTopic(oaFilters.topic.trim())

    const filterParts: string[] = [
      `cited_by_count:>${oaFilters.minCitations}`,
      `from_publication_date:${oaFilters.fromYear}-01-01`,
      `to_publication_date:${oaFilters.toYear}-12-31`,
    ]
    if (oaFilters.type) filterParts.push(`type:${oaFilters.type}`)
    if (oaFilters.openAccess) filterParts.push('open_access.is_oa:true')
    if (oaFilters.journal) filterParts.push(`primary_location.source.display_name.search:${oaFilters.journal}`)

    const params: Record<string, string> = {
      filter: filterParts.join(','),
      select: 'title,authorships,primary_location,publication_year,cited_by_count,open_access',
      'per-page': String(oaFilters.perPage),
      sort: oaFilters.sort,
      mailto: 'proof_dev@protonmail.com',
    }
    if (oaFilters.searchMode === 'fulltext') {
      params.search = oaFilters.topic.trim()
    } else {
      params.filter = `title.search:${oaFilters.topic.trim()},` + params.filter
    }

    try {
      const res = await fetch(`https://api.openalex.org/works?${new URLSearchParams(params)}`)
      if (!res.ok) throw new Error(`OpenAlex ${res.status}`)
      const data = await res.json()
      const works: OAWork[] = data.results || []
      setResults(works.map(w => {
        const candidates = [w.open_access?.oa_url, w.primary_location?.landing_page_url]
        let url = ''
        for (const u of candidates) {
          if (!u) continue
          try { new URL(u); url = u; break } catch {}
        }
        return {
          title: w.title || 'Untitled',
          url,
          author: w.authorships?.[0]?.author?.display_name ?? '',
          journal: w.primary_location?.source?.display_name ?? '',
          year: w.publication_year,
          citations: w.cited_by_count,
        }
      }))
      setFetched(true)
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : 'OpenAlex request failed.')
      setFetched(true)
    }
    setLoading(false)
  }

  // ── CrossRef search ───────────────────────────────────────────────────────────
  async function searchCR() {
    if (!crFilters.query.trim()) return
    setLoading(true); setResults([]); setSelected(new Set()); setStatus(''); setFetched(false)
    setResultTopic(crFilters.query.trim())

    const params = new URLSearchParams({
      [`query.${crFilters.searchMode}`]: crFilters.query.trim(),
      rows: String(crFilters.perPage),
      mailto: 'proof_dev@protonmail.com',
    })
    if (crFilters.sort !== 'relevance') {
      params.set('sort', crFilters.sort)
      params.set('order', 'desc')
    }
    const filterParts: string[] = [
      `from-pub-date:${crFilters.fromYear}`,
      `until-pub-date:${crFilters.toYear}`,
    ]
    if (crFilters.type) filterParts.push(`type:${crFilters.type}`)
    params.set('filter', filterParts.join(','))

    try {
      const res = await fetch(`https://api.crossref.org/works?${params}`)
      if (!res.ok) throw new Error(`CrossRef ${res.status}`)
      const data = await res.json()
      const items: CRWork[] = (data.message?.items || [])
        .filter((w: CRWork) => (w['is-referenced-by-count'] ?? 0) >= crFilters.minCitations)
      setResults(items.map(w => {
        const year = w.published?.['date-parts']?.[0]?.[0] ?? null
        const authors = (w.author || []).map(a => [a.given, a.family].filter(Boolean).join(' '))
        let url = w.URL ?? ''
        try { new URL(url) } catch { url = '' }
        return {
          title: w.title?.[0] ?? 'Untitled',
          url,
          author: authors[0] ?? '',
          journal: w['container-title']?.[0] ?? '',
          year,
          citations: w['is-referenced-by-count'] ?? 0,
        }
      }))
      setFetched(true)
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : 'CrossRef request failed.')
      setFetched(true)
    }
    setLoading(false)
  }

  // ── Insert selected ───────────────────────────────────────────────────────────
  async function insertSelected() {
    const toInsert = results.filter((_, i) => selected.has(i)).filter(r => r.url)
    if (!toInsert.length) return
    setInserting(true); setStatus('')

    const rows = toInsert.map(r => ({
      title: r.title,
      url: r.url,
      topic: resultTopic,
      citation_count: r.citations,
      author: r.author || null,
      published_date: r.year ? `${r.year}-01-01` : null,
      publisher: r.journal || null,
      status: 'approved',
    }))

    const res = await fetch('/api/admin/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, pass }),
    })
    const data = await res.json()
    setStatus(data.message)
    setInserting(false)
    if (data.ok) setSelected(new Set())
  }

  // ── Manual insert ─────────────────────────────────────────────────────────────
  async function insertManual() {
    if (!manual.title.trim() || !manual.url.trim() || !manual.topic.trim()) {
      setManualStatus('Title, URL, and topic are required.')
      return
    }
    try { new URL(manual.url.trim()) } catch {
      setManualStatus('Invalid URL format.')
      return
    }
    setManualLoading(true); setManualStatus('')

    const rows = [{
      title: manual.title.trim(),
      url: manual.url.trim(),
      topic: manual.topic.trim(),
      citation_count: Number(manual.citations) || 0,
      author: manual.author.trim() || null,
      published_date: manual.year ? `${manual.year}-01-01` : null,
      publisher: null,
      status: 'approved',
    }]

    const res = await fetch('/api/admin/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, pass }),
    })
    const data = await res.json()
    setManualStatus(data.message)
    setManualLoading(false)
    if (data.ok) setManual({ title: '', url: '', topic: '', author: '', year: '', citations: '' })
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={pass} onChange={e => { setPass(e.target.value); setAuthError(false) }}
                onKeyDown={e => e.key === 'Enter' && checkPass()} placeholder="••••••••" style={inputStyle} />
            </div>
            {authError && <p style={{ fontSize: '12px', color: '#555', letterSpacing: '0.02em', margin: 0 }}>Incorrect password.</p>}
            <button onClick={checkPass}
              style={{ background: '#f0f0f0', color: '#0a0a0a', border: 'none', borderRadius: '6px', padding: '14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em', marginTop: '4px' }}>
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main layout ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0a0a' }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <main style={{ flex: 1, maxWidth: '720px', width: '100%', margin: '0 auto', padding: '48px 20px', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ paddingBottom: '14px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
          <div style={{ display: 'flex', gap: '20px' }}>
            {(['ingest', 'sources', 'suggestions'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 2px',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                color: tab === t ? '#e8e8e8' : '#2a2a2a',
                borderBottom: tab === t ? '1px solid #e8e8e8' : '1px solid transparent',
                transition: 'color 0.15s',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {tab === 'sources' && <SourcesTab pass={pass} />}
        {tab === 'suggestions' && <SuggestionsTab pass={pass} />}

        {tab === 'ingest' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* Source switcher */}
            <div style={{ padding: '16px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '0' }}>
              {(['openalex', 'crossref', 'manual'] as const).map(src => (
                <button key={src} onClick={() => { setIngestSource(src); setResults([]); setStatus(''); setFetched(false) }}
                  style={{
                    background: ingestSource === src ? '#1a1a1a' : 'none',
                    border: '1px solid #1a1a1a',
                    borderRight: src === 'manual' ? '1px solid #1a1a1a' : 'none',
                    borderRadius: src === 'openalex' ? '4px 0 0 4px' : src === 'manual' ? '0 4px 4px 0' : '0',
                    color: ingestSource === src ? '#e8e8e8' : '#2a2a2a',
                    fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '8px 16px', cursor: 'pointer', transition: 'color 0.15s',
                  }}>
                  {src === 'openalex' ? 'OpenAlex' : src === 'crossref' ? 'CrossRef' : 'Manual'}
                </button>
              ))}
            </div>

            {/* ── OpenAlex filters ── */}
            {ingestSource === 'openalex' && (
              <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Query</label>
                  <input value={oaFilters.topic} onChange={e => setOA(f => ({ ...f, topic: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && searchOA()}
                    placeholder="Topic, subject, or keyword..." style={inputStyle} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Search mode</label>
                    <Select value={oaFilters.searchMode} onChange={v => setOA(f => ({ ...f, searchMode: v as OAFilters['searchMode'] }))}
                      options={[{ value: 'title', label: 'Title only' }, { value: 'fulltext', label: 'Title + Abstract' }]} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Work type</label>
                    <Select value={oaFilters.type} onChange={v => setOA(f => ({ ...f, type: v as OAFilters['type'] }))}
                      options={[{ value: '', label: 'Any' }, { value: 'article', label: 'Article' }, { value: 'review', label: 'Review' }, { value: 'book-chapter', label: 'Book chapter' }]} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Journal / Venue (optional)</label>
                  <input value={oaFilters.journal} onChange={e => setOA(f => ({ ...f, journal: e.target.value }))}
                    placeholder="e.g. Nature, American Economic Review..." style={inputStyle} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Min citations</label>
                    <input type="number" value={oaFilters.minCitations} onChange={e => setOA(f => ({ ...f, minCitations: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>From year</label>
                    <input type="number" value={oaFilters.fromYear} onChange={e => setOA(f => ({ ...f, fromYear: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>To year</label>
                    <input type="number" value={oaFilters.toYear} onChange={e => setOA(f => ({ ...f, toYear: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Results</label>
                    <input type="number" value={oaFilters.perPage} onChange={e => setOA(f => ({ ...f, perPage: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Sort</label>
                    <Select value={oaFilters.sort} onChange={v => setOA(f => ({ ...f, sort: v as OAFilters['sort'] }))}
                      options={[
                        { value: 'cited_by_count:desc', label: 'Citations (high → low)' },
                        { value: 'relevance_score:desc', label: 'Relevance' },
                        { value: 'publication_year:desc', label: 'Newest first' },
                      ]} />
                  </div>
                  <div style={{ paddingBottom: '2px' }}>
                    <Toggle value={oaFilters.openAccess} onChange={v => setOA(f => ({ ...f, openAccess: v }))} label="Open access only" />
                  </div>
                </div>

                <button onClick={searchOA} disabled={loading}
                  style={{ alignSelf: 'flex-start', background: 'none', color: '#888', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '10px 24px', fontSize: '13px', cursor: loading ? 'default' : 'pointer', letterSpacing: '0.04em', opacity: loading ? 0.5 : 1, marginTop: '4px' }}>
                  {loading ? 'Fetching...' : 'Fetch'}
                </button>
              </div>
            )}

            {/* ── CrossRef filters ── */}
            {ingestSource === 'crossref' && (
              <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Query</label>
                  <input value={crFilters.query} onChange={e => setCR(f => ({ ...f, query: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && searchCR()}
                    placeholder="Topic, subject, or keyword..." style={inputStyle} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Search mode</label>
                    <Select value={crFilters.searchMode} onChange={v => setCR(f => ({ ...f, searchMode: v as CRFilters['searchMode'] }))}
                      options={[{ value: 'bibliographic', label: 'Broad (title + abstract)' }, { value: 'title', label: 'Title only' }]} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Work type</label>
                    <Select value={crFilters.type} onChange={v => setCR(f => ({ ...f, type: v as CRFilters['type'] }))}
                      options={[
                        { value: '', label: 'Any' },
                        { value: 'journal-article', label: 'Journal article' },
                        { value: 'book', label: 'Book' },
                        { value: 'book-chapter', label: 'Book chapter' },
                        { value: 'proceedings-article', label: 'Conference paper' },
                      ]} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Min citations</label>
                    <input type="number" value={crFilters.minCitations} onChange={e => setCR(f => ({ ...f, minCitations: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>From year</label>
                    <input type="number" value={crFilters.fromYear} onChange={e => setCR(f => ({ ...f, fromYear: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>To year</label>
                    <input type="number" value={crFilters.toYear} onChange={e => setCR(f => ({ ...f, toYear: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Results</label>
                    <input type="number" value={crFilters.perPage} onChange={e => setCR(f => ({ ...f, perPage: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Sort</label>
                  <Select value={crFilters.sort} onChange={v => setCR(f => ({ ...f, sort: v as CRFilters['sort'] }))}
                    options={[
                      { value: 'is-referenced-by-count', label: 'Citations (high → low)' },
                      { value: 'relevance', label: 'Relevance' },
                      { value: 'published', label: 'Newest first' },
                    ]} />
                </div>

                <button onClick={searchCR} disabled={loading}
                  style={{ alignSelf: 'flex-start', background: 'none', color: '#888', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '10px 24px', fontSize: '13px', cursor: loading ? 'default' : 'pointer', letterSpacing: '0.04em', opacity: loading ? 0.5 : 1, marginTop: '4px' }}>
                  {loading ? 'Fetching...' : 'Fetch'}
                </button>
              </div>
            )}

            {/* ── Manual add ── */}
            {ingestSource === 'manual' && (
              <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Title *</label>
                  <input value={manual.title} onChange={e => setManual(f => ({ ...f, title: e.target.value }))} placeholder="Full title of the source" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>URL *</label>
                  <input value={manual.url} onChange={e => setManual(f => ({ ...f, url: e.target.value }))} placeholder="https://..." style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Topic *</label>
                  <input value={manual.topic} onChange={e => setManual(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Monetary Policy" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Author (optional)</label>
                    <input value={manual.author} onChange={e => setManual(f => ({ ...f, author: e.target.value }))} placeholder="Last, First" style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Year (optional)</label>
                    <input type="number" value={manual.year} onChange={e => setManual(f => ({ ...f, year: e.target.value }))} placeholder="2020" style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Citations (optional)</label>
                    <input type="number" value={manual.citations} onChange={e => setManual(f => ({ ...f, citations: e.target.value }))} placeholder="0" style={inputStyle} />
                  </div>
                </div>
                {manualStatus && (
                  <div style={{ fontSize: '12px', color: '#555', letterSpacing: '0.04em' }}>{manualStatus}</div>
                )}
                <button onClick={insertManual} disabled={manualLoading}
                  style={{ alignSelf: 'flex-start', background: '#f0f0f0', color: '#0a0a0a', border: 'none', borderRadius: '6px', padding: '10px 24px', fontSize: '13px', fontWeight: 600, cursor: manualLoading ? 'default' : 'pointer', letterSpacing: '0.04em', opacity: manualLoading ? 0.5 : 1, marginTop: '4px' }}>
                  {manualLoading ? 'Adding...' : 'Add to Proof'}
                </button>
              </div>
            )}

            {/* ── No results message ── */}
            {fetched && !loading && results.length === 0 && !status && ingestSource !== 'manual' && (
              <div style={{ padding: '24px 0', fontSize: '13px', color: '#2a2a2a', letterSpacing: '0.04em' }}>
                No results found. Try different filters.
              </div>
            )}

            {/* ── Results list ── */}
            {ingestSource !== 'manual' && (
              <ResultsList
                results={results}
                selected={selected}
                toggle={toggle}
                toggleAll={toggleAll}
                inserting={inserting}
                onInsert={insertSelected}
                status={status}
                topic={resultTopic}
              />
            )}

          </div>
        )}
      </main>
    </div>
  )
}
