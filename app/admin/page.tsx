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

const field: React.CSSProperties = {
  background: '#111',
  border: '1px solid #1e1e1e',
  borderRadius: '6px',
  padding: '10px 14px',
  color: '#e8e8e8',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
}

const label: React.CSSProperties = {
  fontSize: '10px',
  color: '#333',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
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
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '280px' }}>
          <span style={{ fontSize: '10px', color: '#2a2a2a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Proof / Admin</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setAuthError(false) }}
              onKeyDown={e => e.key === 'Enter' && checkPass()}
              placeholder="password"
              style={{ ...field, flex: 1 }}
            />
            <button
              onClick={checkPass}
              style={{
                background: 'none', color: '#555', border: '1px solid #1e1e1e',
                borderRadius: '6px', padding: '10px 16px', fontSize: '13px',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              →
            </button>
          </div>
          {authError && <span style={{ fontSize: '11px', color: '#333', letterSpacing: '0.04em' }}>Incorrect password.</span>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', padding: '48px 40px' }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        select option { background: #111; }
      `}</style>

      <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        <div style={{ paddingBottom: '16px', borderBottom: '1px solid #1a1a1a' }}>
          <span style={{ fontSize: '10px', color: '#2a2a2a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Proof / Admin / Ingest
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={label}>Topic</label>
            <input
              value={filters.topic}
              onChange={e => setFilters(f => ({ ...f, topic: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="e.g. monetary policy"
              style={field}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={label}>Min Citations</label>
              <input
                type="number"
                value={filters.minCitations}
                onChange={e => setFilters(f => ({ ...f, minCitations: Number(e.target.value) }))}
                style={field}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={label}>From Year</label>
              <input
                type="number"
                value={filters.fromYear}
                onChange={e => setFilters(f => ({ ...f, fromYear: Number(e.target.value) }))}
                style={field}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={label}>Results</label>
              <input
                type="number"
                value={filters.perPage}
                onChange={e => setFilters(f => ({ ...f, perPage: Number(e.target.value) }))}
                style={field}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={label}>Sort</label>
              <select
                value={filters.sort}
                onChange={e => setFilters(f => ({ ...f, sort: e.target.value as Filters['sort'] }))}
                style={{ ...field, cursor: 'pointer' }}
              >
                <option value="cited_by_count:desc">Citations (high → low)</option>
                <option value="relevance_score:desc">Relevance</option>
                <option value="publication_year:desc">Newest first</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', paddingBottom: '2px' }}>
              <div
                onClick={() => setFilters(f => ({ ...f, openAccess: !f.openAccess }))}
                style={{
                  width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
                  background: filters.openAccess ? '#e8e8e8' : '#1e1e1e',
                  border: '1px solid',
                  borderColor: filters.openAccess ? '#e8e8e8' : '#2a2a2a',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                <div style={{
                  position: 'absolute', top: '2px',
                  left: filters.openAccess ? '17px' : '2px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: filters.openAccess ? '#0a0a0a' : '#333',
                  transition: 'left 0.15s',
                }} />
              </div>
              <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Open access only</span>
            </label>
          </div>
        </div>

        <button
          onClick={search}
          disabled={loading}
          style={{
            alignSelf: 'flex-start', background: '#f0f0f0', color: '#0a0a0a',
            border: 'none', borderRadius: '6px', padding: '10px 24px',
            fontSize: '12px', fontWeight: 600, cursor: loading ? 'default' : 'pointer',
            letterSpacing: '0.06em', textTransform: 'uppercase', opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Fetching...' : 'Fetch'}
        </button>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: '12px', borderBottom: '1px solid #1a1a1a', marginBottom: '4px',
            }}>
              <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.06em' }}>
                {results.length} results — {selected.size} selected
              </span>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <button
                  onClick={toggleAll}
                  style={{
                    background: 'none', border: 'none', color: '#333',
                    fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#333')}
                >
                  {selected.size === results.length ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  onClick={insertSelected}
                  disabled={!selected.size || inserting}
                  style={{
                    background: selected.size ? '#f0f0f0' : 'none',
                    color: selected.size ? '#0a0a0a' : '#2a2a2a',
                    border: selected.size ? 'none' : '1px solid #1e1e1e',
                    borderRadius: '6px', padding: '8px 18px',
                    fontSize: '11px', fontWeight: 600,
                    cursor: selected.size ? 'pointer' : 'default',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    opacity: inserting ? 0.5 : 1,
                  }}
                >
                  {inserting ? 'Inserting...' : `Insert ${selected.size}`}
                </button>
              </div>
            </div>

            {status && (
              <div style={{ padding: '10px 0', fontSize: '12px', color: '#555', letterSpacing: '0.04em' }}>
                {status}
              </div>
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
                    display: 'flex', gap: '16px', alignItems: 'flex-start',
                    padding: '11px 8px', borderBottom: '1px solid #111',
                    cursor: 'pointer', opacity: url ? 1 : 0.3,
                    background: isSelected ? '#0f0f0f' : 'transparent',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, marginTop: '2px',
                    border: `1px solid ${isSelected ? '#555' : '#222'}`,
                    background: isSelected ? '#333' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <span style={{ fontSize: '9px', color: '#e8e8e8', lineHeight: 1 }}>✓</span>}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.title}
                    </span>
                    <span style={{ fontSize: '11px', color: '#2a2a2a' }}>{meta}</span>
                    <span style={{ fontSize: '10px', color: '#1e1e1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {url || 'no url — will be skipped'}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: '#2a2a2a', flexShrink: 0, letterSpacing: '0.02em' }}>
                    {w.cited_by_count.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
