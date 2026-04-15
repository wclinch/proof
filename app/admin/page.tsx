'use client'
import { useState, useEffect } from 'react'

interface Row   { label: string; count: number }
interface DayRow { date: string; count: number }
interface Stats {
  total: number
  byType: Row[]
  byInput: Row[]
  byYear: Row[]
  byPublisher: Row[]
  topKeywords: Row[]
  topConcepts: Row[]
  daily: DayRow[]
}

type Range = '7d' | '30d' | '90d' | 'all'

const RANGES: { label: string; value: Range; ms: number | null }[] = [
  { label: '7D',  value: '7d',  ms: 7  * 86400_000 },
  { label: '30D', value: '30d', ms: 30 * 86400_000 },
  { label: '90D', value: '90d', ms: 90 * 86400_000 },
  { label: 'All', value: 'all', ms: null },
]

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv  = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportSection(name: string, rows: Row[], total: number) {
  const date = new Date().toISOString().slice(0, 10)
  downloadCSV(
    `proof-${name}-${date}.csv`,
    ['label', 'count', 'pct_of_total'],
    rows.map(r => [r.label, String(r.count), total > 0 ? ((r.count / total) * 100).toFixed(2) + '%' : '0%']),
  )
}

function DataSection({
  title, rows, total, emptyMsg,
}: {
  title: string
  rows: Row[]
  total: number
  emptyMsg?: string
}) {
  const max = rows[0]?.count ?? 1
  const slug = title.toLowerCase().replace(/[^a-z]+/g, '-')

  return (
    <div style={{ marginBottom: '48px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #1a1a1a',
      }}>
        <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</span>
        {rows.length > 0 && (
          <button
            onClick={() => exportSection(slug, rows, total)}
            style={{
              background: 'none', border: '1px solid #1e1e1e', borderRadius: '3px',
              padding: '3px 10px', fontSize: '10px', color: '#444', letterSpacing: '0.08em',
              textTransform: 'uppercase', fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#444' }}
          >
            Export CSV ↓
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#2a2a2a' }}>{emptyMsg ?? 'No data'}</div>
      ) : rows.map(r => {
        const pct = max > 0 ? (r.count / max) * 100 : 0
        const totalPct = total > 0 ? ((r.count / total) * 100).toFixed(1) : '0'
        return (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '7px' }}>
            <div style={{ width: '180px', flexShrink: 0, fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.label}
            </div>
            <div style={{ flex: 1, background: '#111', borderRadius: '2px', height: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#1e3a2a', borderRadius: '2px' }} />
            </div>
            <div style={{ width: '28px', flexShrink: 0, fontSize: '11px', color: '#444', textAlign: 'right' }}>{r.count}</div>
            <div style={{ width: '42px', flexShrink: 0, fontSize: '10px', color: '#2a2a2a', textAlign: 'right' }}>{totalPct}%</div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [savedPw,  setSavedPw]  = useState('')
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [range,    setRange]    = useState<Range>('all')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function fetchStats(pw: string, r: Range) {
    setLoading(true)
    setError(null)
    const ms = RANGES.find(x => x.value === r)?.ms
    const since = ms ? Date.now() - ms : null
    const url = '/api/admin/stats' + (since ? `?since=${since}` : '')
    try {
      const res  = await fetch(url, { headers: { 'x-admin-password': pw } })
      const data = await res.json() as Stats & { error?: string }
      if (!res.ok) setError(data.error ?? 'Failed')
      else { setStats(data); setSavedPw(pw) }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  // Refetch when range changes (only if already authenticated)
  useEffect(() => {
    if (savedPw) fetchStats(savedPw, range)
  }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRawExport() {
    const ms    = RANGES.find(x => x.value === range)?.ms
    const since = ms ? Date.now() - ms : null
    const url   = '/api/admin/export' + (since ? `?since=${since}` : '')
    // Open in a new tab — browser will download via Content-Disposition header
    const a = document.createElement('a')
    a.href  = url
    // Pass password via sessionStorage so the fetch can pick it up
    // Instead, open via fetch + blob to attach the header
    fetch(url, { headers: { 'x-admin-password': savedPw } })
      .then(r => r.blob())
      .then(blob => {
        const date = new Date().toISOString().slice(0, 10)
        a.href     = URL.createObjectURL(blob)
        a.download = `proof-raw-${date}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!stats) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
        <form onSubmit={e => { e.preventDefault(); fetchStats(password, range) }}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '260px' }}>
          <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '4px',
              color: '#ccc', fontSize: '13px', padding: '9px 12px', outline: 'none', fontFamily: 'inherit',
            }}
          />
          {error && <div style={{ fontSize: '11px', color: '#733' }}>{error}</div>}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '4px',
              color: password && !loading ? '#bbb' : '#333', fontSize: '12px',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit',
              padding: '9px', cursor: password && !loading ? 'pointer' : 'default', outline: 'none',
            }}
          >
            {loading ? '...' : 'Enter'}
          </button>
        </form>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  const total = stats.total

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '48px 40px', maxWidth: '800px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '36px' }}>
        <span style={{ fontSize: '11px', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Admin — Proof
        </span>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={() => fetchStats(savedPw, range)}
            disabled={loading}
            style={{ background: 'none', border: 'none', fontSize: '11px', color: loading ? '#222' : '#333', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit', cursor: loading ? 'default' : 'pointer', padding: 0, outline: 'none' }}
          >
            {loading ? '...' : 'Refresh'}
          </button>
          <button
            onClick={() => { setStats(null); setSavedPw('') }}
            style={{ background: 'none', border: 'none', fontSize: '11px', color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit', cursor: 'pointer', padding: 0, outline: 'none' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Time range + summary row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              style={{
                background: range === r.value ? '#141414' : 'none',
                border: `1px solid ${range === r.value ? '#2a2a2a' : 'transparent'}`,
                borderRadius: '3px', padding: '4px 12px',
                fontSize: '11px', color: range === r.value ? '#888' : '#333',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '12px', color: '#444' }}>
            {total.toLocaleString()} {total === 1 ? 'source' : 'sources'}
          </span>
          <button
            onClick={handleRawExport}
            style={{
              background: 'none', border: '1px solid #1e1e1e', borderRadius: '3px',
              padding: '4px 12px', fontSize: '10px', color: '#444', letterSpacing: '0.08em',
              textTransform: 'uppercase', fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#444' }}
          >
            Export raw CSV ↓
          </button>
        </div>
      </div>

      {/* Data sections */}
      <DataSection title="Keywords"              rows={stats.topKeywords} total={total} emptyMsg="No keyword data yet — analyze sources to populate" />
      <DataSection title="Concepts & Frameworks" rows={stats.topConcepts} total={total} emptyMsg="No concept data yet" />
      <DataSection title="Publishers & Journals" rows={stats.byPublisher} total={total} emptyMsg="No publisher data yet" />
      <DataSection title="Source Type"           rows={stats.byType}      total={total} />
      <DataSection title="Input Method"          rows={stats.byInput}     total={total} />
      <DataSection title="Publication Year"      rows={stats.byYear.sort((a, b) => b.label.localeCompare(a.label))} total={total} />

    </div>
  )
}
