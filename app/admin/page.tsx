'use client'

import { useState, useRef, useEffect } from 'react'

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

const SORT_OPTIONS = [
  { value: 'cited_by_count:desc', label: 'Citations (high → low)' },
  { value: 'relevance_score:desc', label: 'Relevance' },
  { value: 'publication_year:desc', label: 'Newest first' },
]

function Dropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = SORT_OPTIONS.find(o => o.value === value)

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
          {SORT_OPTIONS.map(o => (
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

const inputStyle: React.CSSProperties = {
  background: '#111', border: '1px solid #1e1e1e', borderRadius: '6px',
  padding: '14px 16px', color: '#f0f0f0', fontSize: '14px', outline: 'none',
  width: '100%', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase',
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
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={pass}
                onChange={e => { setPass(e.target.value); setAuthError(false) }}
                onKeyDown={e => e.key === 'Enter' && checkPass()}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
            {authError && <p style={{ fontSize: '12px', color: '#555', letterSpacing: '0.02em', margin: 0 }}>Incorrect password.</p>}
            <button
              onClick={checkPass}
              style={{
                background: '#f0f0f0', color: '#0a0a0a', border: 'none', borderRadius: '6px',
                padding: '14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                letterSpacing: '0.04em', marginTop: '4px',
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0a0a' }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <main style={{ flex: 1, maxWidth: '680px', width: '100%', margin: '0 auto', padding: '48px 20px', display: 'flex', flexDirection: 'column', gap: '0' }}>

        <div style={{ paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Admin / Ingest
          </span>
        </div>

        {/* Filters */}
        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Topic</label>
            <input
              value={filters.topic}
              onChange={e => setFilters(f => ({ ...f, topic: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="monetary policy"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Min Citations</label>
              <input type="number" value={filters.minCitations} onChange={e => setFilters(f => ({ ...f, minCitations: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>From Year</label>
              <input type="number" value={filters.fromYear} onChange={e => setFilters(f => ({ ...f, fromYear: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Results</label>
              <input type="number" value={filters.perPage} onChange={e => setFilters(f => ({ ...f, perPage: Number(e.target.value) }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Sort</label>
              <Dropdown value={filters.sort} onChange={v => setFilters(f => ({ ...f, sort: v as Filters['sort'] }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '2px' }}>
              <button
                onClick={() => setFilters(f => ({ ...f, openAccess: !f.openAccess }))}
                style={{
                  width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
                  background: filters.openAccess ? '#444' : '#1a1a1a',
                  border: '1px solid', borderColor: filters.openAccess ? '#555' : '#222',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.15s',
                  padding: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: '2px',
                  left: filters.openAccess ? '16px' : '2px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: filters.openAccess ? '#e8e8e8' : '#333',
                  transition: 'left 0.15s',
                }} />
              </button>
              <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Open access only</span>
            </div>
          </div>

          <button
            onClick={search}
            disabled={loading}
            style={{
              alignSelf: 'flex-start', background: '#f0f0f0', color: '#0a0a0a',
              border: 'none', borderRadius: '6px', padding: '10px 24px',
              fontSize: '13px', fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              letterSpacing: '0.04em', opacity: loading ? 0.5 : 1, marginTop: '4px',
            }}
          >
            {loading ? 'Fetching...' : 'Fetch'}
          </button>
        </div>

        {/* Results */}
        {(results.length > 0 || status) && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 0', borderBottom: '1px solid #1a1a1a',
            }}>
              <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.06em' }}>
                {results.length} results — {selected.size} selected
              </span>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <button
                  onClick={toggleAll}
                  style={{
                    background: 'none', border: 'none', color: '#2a2a2a',
                    fontSize: '11px', cursor: 'pointer', letterSpacing: '0.04em', padding: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
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
                    display: 'flex', gap: '16px', alignItems: 'center',
                    padding: '11px 0', borderBottom: '1px solid #141414',
                    cursor: 'pointer', opacity: url ? 1 : 0.3,
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
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.title}
                    </span>
                    <span style={{ fontSize: '11px', color: '#2a2a2a' }}>{meta}</span>
                  </div>

                  <span style={{ fontSize: '10px', color: '#222', flexShrink: 0, letterSpacing: '0.04em' }}>
                    {w.cited_by_count.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
