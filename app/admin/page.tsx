'use client'
import { useState } from 'react'

interface StatsRow { label: string; count: number }
interface DayRow   { date: string; count: number }

interface Stats {
  total: number
  recentCount: number
  byType: StatsRow[]
  byInput: StatsRow[]
  byYear: StatsRow[]
  topKeywords: StatsRow[]
  topConcepts: StatsRow[]
  daily: DayRow[]
}

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
      <div style={{ width: '160px', flexShrink: 0, fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ flex: 1, background: '#111', borderRadius: '2px', height: '6px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#1e3a2a', borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ width: '36px', flexShrink: 0, fontSize: '11px', color: '#444', textAlign: 'right' }}>
        {count}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid #1a1a1a' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function DailyChart({ daily }: { daily: DayRow[] }) {
  if (!daily.length) return <div style={{ fontSize: '12px', color: '#333' }}>No data</div>
  const max = Math.max(...daily.map(d => d.count))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '60px' }}>
      {daily.map(d => (
        <div key={d.date} title={`${d.date}: ${d.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'default' }}>
          <div style={{
            width: '100%', background: '#1e3a2a', borderRadius: '2px 2px 0 0',
            height: max > 0 ? `${(d.count / max) * 100}%` : '2px',
            minHeight: '2px',
          }} />
        </div>
      ))}
    </div>
  )
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [stats, setStats]       = useState<Stats | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [savedPw, setSavedPw]   = useState('')

  async function fetchStats(pw: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-password': pw },
      })
      const data = await res.json() as Stats & { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed')
      } else {
        setStats(data)
        setSavedPw(pw)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    await fetchStats(password)
  }

  if (!stats) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '260px' }}>
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

  const maxKeyword = stats.topKeywords[0]?.count ?? 1
  const maxConcept = stats.topConcepts[0]?.count ?? 1
  const maxType    = stats.byType[0]?.count ?? 1
  const maxYear    = stats.byYear[0]?.count ?? 1

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '56px 40px', maxWidth: '860px', margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '40px' }}>
        <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin — Proof</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button
            onClick={() => fetchStats(savedPw)}
            disabled={loading}
            style={{ background: 'none', border: 'none', fontSize: '11px', color: loading ? '#2a2a2a' : '#333', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit', cursor: loading ? 'default' : 'pointer', padding: 0, outline: 'none' }}
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

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
        {[
          { label: 'Total sources', value: stats.total.toLocaleString() },
          { label: 'Last 7 days', value: stats.recentCount.toLocaleString() },
          { label: 'Input types', value: stats.byInput.length.toString() },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '16px 20px' }}>
            <div style={{ fontSize: '24px', fontWeight: 300, color: '#ccc', marginBottom: '4px' }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Daily volume */}
      <Section title="Daily volume — last 30 days">
        <DailyChart daily={stats.daily} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontSize: '10px', color: '#333' }}>{stats.daily[0]?.date ?? ''}</span>
          <span style={{ fontSize: '10px', color: '#333' }}>{stats.daily[stats.daily.length - 1]?.date ?? ''}</span>
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        {/* Source types */}
        <Section title="Source type">
          {stats.byType.length === 0
            ? <div style={{ fontSize: '12px', color: '#333' }}>No data</div>
            : stats.byType.map(r => <Bar key={r.label} label={r.label} count={r.count} max={maxType} />)

          }
        </Section>

        {/* Input type */}
        <Section title="Input type">
          {stats.byInput.length === 0
            ? <div style={{ fontSize: '12px', color: '#333' }}>No data</div>
            : stats.byInput.map(r => <Bar key={r.label} label={r.label} count={r.count} max={stats.byInput[0]?.count ?? 1}  />)
          }
        </Section>

        {/* Year */}
        <Section title="Year">
          {stats.byYear.length === 0
            ? <div style={{ fontSize: '12px', color: '#333' }}>No data</div>
            : stats.byYear
                .sort((a, b) => b.label.localeCompare(a.label))
                .map(r => <Bar key={r.label} label={r.label} count={r.count} max={maxYear}  />)
          }
        </Section>

        {/* Placeholder for symmetry */}
        <div />
      </div>

      {/* Keywords */}
      <Section title="Top keywords">
        {stats.topKeywords.length === 0
          ? <div style={{ fontSize: '12px', color: '#333' }}>No data yet — keywords populate as sources are analyzed</div>
          : stats.topKeywords.map(r => <Bar key={r.label} label={r.label} count={r.count} max={maxKeyword} />)
        }
      </Section>

      {/* Concepts */}
      <Section title="Top concepts &amp; frameworks">
        {stats.topConcepts.length === 0
          ? <div style={{ fontSize: '12px', color: '#333' }}>No data yet</div>
          : stats.topConcepts.map(r => <Bar key={r.label} label={r.label} count={r.count} max={maxConcept}  />)
        }
      </Section>

    </div>
  )
}
