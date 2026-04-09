'use client'

import { useState } from 'react'

type Filters = {
  topic: string
  minCitations: number
  fromYear: number
  perPage: number
  openAccess: boolean
  sort: 'cited_by_count:desc' | 'relevance_score:desc' | 'publication_year:desc'
}

type Work = {
  title: string
  authorships: Array<{ author: { display_name: string } }>
  primary_location: { source?: { display_name: string }; landing_page_url?: string } | null
  publication_year: number
  cited_by_count: number
  open_access: { oa_url?: string }
}

function getUrl(w: Work): string {
  return w.open_access?.oa_url || w.primary_location?.landing_page_url || ''
}

const input = {
  background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '4px',
  padding: '9px 12px', color: '#f0f0f0', fontSize: '12px', outline: 'none', width: '100%',
  fontFamily: 'monospace',
}

export default function Admin() {
  const [pass, setPass] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)

  const [filters, setFilters] = useState<Filters>({
    topic: '',
    minCitations: 50,
    fromYear: 2005,
    perPage: 30,
    openAccess: true,
    sort: 'cited_by_count:desc',
  })

  const [results, setResults] = useState<Work[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [status, setStatus] = useState('')

  function checkPass() {
    if (pass === process.env.NEXT_PUBLIC_ADMIN_PASS) {
      setAuthed(true)
    } else {
      setAuthError(true)
    }
  }

  async function search() {
    if (!filters.topic.trim()) return
    setLoading(true)
    setResults([])
    setSelected(new Set())
    setStatus('')

    const filterParts = [
      `title.search:${filters.topic}`,
      `cited_by_count:>${filters.minCitations}`,
      `from_publication_date:${filters.fromYear}-01-01`,
    ]
    if (filters.openAccess) filterParts.push('open_access.is_oa:true')

    const params = new URLSearchParams({
      filter: filterParts.join(','),
      select: 'title,authorships,primary_location,publication_year,cited_by_count,open_access',
      'per-page': String(filters.perPage),
      sort: filters.sort,
      mailto: 'proof_dev@protonmail.com',
    })

    try {
      const res = await fetch(`https://api.openalex.org/works?${params}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setStatus('OpenAlex request failed.')
    }
    setLoading(false)
  }

  function toggle(i: number) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(i) ? s.delete(i) : s.add(i)
      return s
    })
  }

  function toggleAll() {
    setSelected(selected.size === results.length ? new Set() : new Set(results.map((_, i) => i)))
  }

  async function insertSelected() {
    const toInsert = results.filter((_, i) => selected.has(i))
    if (!toInsert.length) return
    setInserting(true)
    setStatus('')

    const rows = toInsert
      .map(w => ({
        title: w.title,
        url: getUrl(w),
        topic: filters.topic.trim(),
        citation_count: w.cited_by_count,
        author: w.authorships?.[0]?.author?.display_name ?? null,
        published_date: w.publication_year ? `${w.publication_year}-01-01` : null,
        publisher: w.primary_location?.source?.display_name ?? null,
        status: 'approved',
      }))
      .filter(r => r.url)

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

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '260px' }}>
          <span style={{ fontSize: '10px', color: '#333', letterSpacing: '0.1em' }}>PROOF / ADMIN</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setAuthError(false) }}
              onKeyDown={e => e.key === 'Enter' && checkPass()}
              placeholder="password"
              style={{ ...input, flex: 1 }}
            />
            <button
              onClick={checkPass}
              style={{ background: '#f0f0f0', color: '#0a0a0a', border: 'none', borderRadius: '4px', padding: '9px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}
            >
              →
            </button>
          </div>
          {authError && <span style={{ fontSize: '10px', color: '#444' }}>incorrect</span>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#f0f0f0', padding: '40px', fontFamily: 'monospace' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        <span style={{ fontSize: '10px', color: '#333', letterSpacing: '0.1em' }}>PROOF / ADMIN / INGEST</span>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em' }}>TOPIC</label>
            <input
              value={filters.topic}
              onChange={e => setFilters(f => ({ ...f, topic: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="monetary policy"
              style={input}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em' }}>MIN CITATIONS</label>
            <input
              type="number"
              value={filters.minCitations}
              onChange={e => setFilters(f => ({ ...f, minCitations: Number(e.target.value) }))}
              style={input}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em' }}>FROM YEAR</label>
            <input
              type="number"
              value={filters.fromYear}
              onChange={e => setFilters(f => ({ ...f, fromYear: Number(e.target.value) }))}
              style={input}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em' }}>RESULTS</label>
            <input
              type="number"
              value={filters.perPage}
              onChange={e => setFilters(f => ({ ...f, perPage: Number(e.target.value) }))}
              style={input}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em' }}>SORT</label>
            <select
              value={filters.sort}
              onChange={e => setFilters(f => ({ ...f, sort: e.target.value as Filters['sort'] }))}
              style={{ ...input, cursor: 'pointer' }}
            >
              <option value="cited_by_count:desc">Citations ↓</option>
              <option value="relevance_score:desc">Relevance</option>
              <option value="publication_year:desc">Newest first</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '10px', color: '#444', letterSpacing: '0.08em' }}>
              <input
                type="checkbox"
                checked={filters.openAccess}
                onChange={e => setFilters(f => ({ ...f, openAccess: e.target.checked }))}
              />
              OPEN ACCESS ONLY
            </label>
          </div>
        </div>

        <button
          onClick={search}
          disabled={loading}
          style={{
            alignSelf: 'flex-start', background: '#f0f0f0', color: '#0a0a0a',
            border: 'none', borderRadius: '4px', padding: '9px 20px',
            fontSize: '11px', fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.08em', opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'FETCHING...' : 'FETCH'}
        </button>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #1a1a1a', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: '#444', letterSpacing: '0.06em' }}>
                {results.length} RESULTS — {selected.size} SELECTED
              </span>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button
                  onClick={toggleAll}
                  style={{ background: 'none', border: 'none', color: '#444', fontSize: '10px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0 }}
                >
                  {selected.size === results.length ? 'DESELECT ALL' : 'SELECT ALL'}
                </button>
                <button
                  onClick={insertSelected}
                  disabled={!selected.size || inserting}
                  style={{
                    background: selected.size ? '#f0f0f0' : '#141414',
                    color: selected.size ? '#0a0a0a' : '#333',
                    border: 'none', borderRadius: '4px',
                    padding: '8px 16px', fontSize: '11px', fontWeight: 700,
                    cursor: selected.size ? 'pointer' : 'default', letterSpacing: '0.06em',
                  }}
                >
                  {inserting ? 'INSERTING...' : `INSERT ${selected.size}`}
                </button>
              </div>
            </div>

            {status && (
              <div style={{ padding: '8px 0', fontSize: '11px', color: '#888', letterSpacing: '0.04em' }}>{status}</div>
            )}

            {results.map((w, i) => {
              const url = getUrl(w)
              const isSelected = selected.has(i)
              const meta = [
                w.authorships?.[0]?.author?.display_name,
                w.primary_location?.source?.display_name,
                w.publication_year,
              ].filter(Boolean).join(' · ')

              return (
                <div
                  key={i}
                  onClick={() => toggle(i)}
                  style={{
                    display: 'flex', gap: '14px', alignItems: 'flex-start',
                    padding: '9px 6px', borderBottom: '1px solid #0f0f0f',
                    cursor: 'pointer',
                    background: isSelected ? '#0f0f0f' : 'transparent',
                    opacity: url ? 1 : 0.35,
                  }}
                >
                  <input type="checkbox" checked={isSelected} readOnly style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.title}
                    </span>
                    <span style={{ fontSize: '10px', color: '#333' }}>{meta}</span>
                    <span style={{ fontSize: '10px', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {url || 'no url — will be skipped'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#2a2a2a', flexShrink: 0 }}>{w.cited_by_count.toLocaleString()} citations</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
