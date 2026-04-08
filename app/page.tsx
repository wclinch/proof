'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase'

type Source = {
  id: string
  title: string
  url: string
  topic: string
  citation_count: number
}

function HomeInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Source[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [topics, setTopics] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('proof_history')
    if (stored) setHistory(JSON.parse(stored))
  }, [])

  function addToHistory(q: string) {
    setHistory(prev => {
      const updated = [q, ...prev.filter(h => h.toLowerCase() !== q.toLowerCase())].slice(0, 10)
      localStorage.setItem('proof_history', JSON.stringify(updated))
      return updated
    })
  }

  function removeFromHistory(q: string) {
    setHistory(prev => {
      const updated = prev.filter(h => h !== q)
      localStorage.setItem('proof_history', JSON.stringify(updated))
      return updated
    })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) fetchSaved(uid)
    })
    fetchTopics()
  }, [])

  // React to URL param changes — drives all search state
  useEffect(() => {
    const q = searchParams.get('q')
    if (!q) {
      setSearched(false)
      setResults([])
      setQuery('')
      return
    }
    setQuery(q)
    setLoading(true)
    setSearched(true)
    supabase
      .from('sources')
      .select('*')
      .eq('status', 'approved')
      .ilike('topic', `%${q}%`)
      .order('citation_count', { ascending: false })
      .then(({ data }) => {
        setResults(weightedShuffle(data || []))
        setLoading(false)
      })
  }, [searchParams])

  async function fetchTopics() {
    const { data } = await supabase.from('sources').select('topic').eq('status', 'approved')
    const unique = [...new Set(data?.map(r => r.topic) ?? [])].slice(0, 6)
    setTopics(unique)
  }

  async function fetchSaved(uid: string) {
    const { data } = await supabase.from('saved_sources').select('source_id').eq('user_id', uid)
    setSavedIds(new Set(data?.map(r => r.source_id) ?? []))
  }

  async function toggleSave(sourceId: string) {
    if (!userId) return
    if (savedIds.has(sourceId)) {
      await supabase.from('saved_sources').delete().eq('user_id', userId).eq('source_id', sourceId)
      setSavedIds(prev => { const s = new Set(prev); s.delete(sourceId); return s })
    } else {
      await supabase.from('saved_sources').insert({ user_id: userId, source_id: sourceId })
      setSavedIds(prev => new Set(prev).add(sourceId))
    }
  }

  async function runSearch(q: string) {
    setLoading(true)
    setSearched(true)
    const { data } = await supabase
      .from('sources')
      .select('*')
      .eq('status', 'approved')
      .ilike('topic', `%${q}%`)
      .order('citation_count', { ascending: false })
    setResults(weightedShuffle(data || []))
    setLoading(false)
  }

  function search(q: string) {
    if (!q.trim()) return
    addToHistory(q.trim())
    router.push(`/?q=${encodeURIComponent(q)}`, { scroll: false })
  }

  function weightedShuffle(sources: Source[]) {
    const sorted = [...sources]
    const len = sorted.length
    const top = sorted.slice(0, Math.ceil(len * 0.4))
    const secondary = sorted.slice(Math.ceil(len * 0.4), Math.ceil(len * 0.7))
    const recent = sorted.slice(Math.ceil(len * 0.7), Math.ceil(len * 0.9))
    const random = sorted.slice(Math.ceil(len * 0.9))
    const shuffle = (arr: Source[]) => arr.sort(() => Math.random() - 0.5)
    return [...shuffle(top), ...shuffle(secondary), ...shuffle(recent), ...shuffle(random)]
  }

  function fillSearch(topic: string) {
    setQuery(topic)
    search(topic)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: searched ? 'flex-start' : 'center',
        padding: searched ? '48px 20px' : '40px 20px',
        gap: '40px',
      }}>
        {!searched && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Research, verified.
            </h1>
            <p style={{ fontSize: '15px', color: '#555', letterSpacing: '0.02em' }}>
              Sources from real student essays. Vetted by educators.
            </p>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: '620px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#111',
            border: '1px solid #222',
            borderRadius: '8px',
            padding: '0 20px',
            gap: '12px',
          }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(query)}
              placeholder="Search a topic, subject, or keyword..."
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#f0f0f0',
                fontSize: '15px',
                padding: '18px 0',
              }}
            />
            {searched && (
              <button
                onClick={() => router.push('/')}
                style={{
                  background: 'none', border: 'none', color: '#333',
                  fontSize: '18px', cursor: 'pointer', padding: '0 4px',
                  lineHeight: 1, flexShrink: 0,
                }}
              >
                ×
              </button>
            )}
            <button
              onClick={() => search(query)}
              style={{
                background: '#f0f0f0',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: '5px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.03em',
                flexShrink: 0,
              }}
            >
              Search
            </button>
          </div>

          {!searched && history.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '200px', overflowY: 'auto' }}>
              {history.map(h => (
                <div key={h} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 4px', borderBottom: '1px solid #111',
                }}>
                  <button
                    onClick={() => { setQuery(h); search(h) }}
                    style={{
                      background: 'none', border: 'none', color: '#333', cursor: 'pointer',
                      fontSize: '13px', padding: 0, letterSpacing: '0.02em', textAlign: 'left',
                    }}
                  >
                    {h}
                  </button>
                  <button
                    onClick={() => removeFromHistory(h)}
                    style={{
                      background: 'none', border: 'none', color: '#222', cursor: 'pointer',
                      fontSize: '16px', padding: '0 4px', lineHeight: 1, flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {!searched && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {topics.map(topic => (
              <button
                key={topic}
                onClick={() => fillSearch(topic)}
                style={{
                  background: '#111',
                  border: '1px solid #1e1e1e',
                  color: '#444',
                  fontSize: '12px',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  letterSpacing: '0.03em',
                }}
              >
                {topic}
              </button>
            ))}
          </div>}
        </div>

        {searched && (
          <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              fontSize: '11px',
              color: '#2e2e2e',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              paddingBottom: '14px',
              borderBottom: '1px solid #1a1a1a',
            }}>
              {loading ? 'Searching...' : `${results.length} sources found`}
            </div>

            {!loading && results.length === 0 && (
              <div style={{ padding: '40px 0', color: '#333', fontSize: '13px', letterSpacing: '0.04em' }}>
                No sources found. Try a different topic.
              </div>
            )}

            {results.map(source => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '24px',
                  padding: '16px 0',
                  borderBottom: '1px solid #141414',
                  textDecoration: 'none',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {source.title}
                  </span>
                  <span style={{ fontSize: '11px', color: '#2e2e2e' }}>
                    {source.url}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', color: '#3a3a3a' }}>{source.citation_count} cited</span>
                  <span style={{ fontSize: '10px', color: '#222', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{source.topic}</span>
                  {userId && (
                    <button
                      onClick={e => { e.preventDefault(); toggleSave(source.id) }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: '11px', color: savedIds.has(source.id) ? '#888' : '#2a2a2a',
                        letterSpacing: '0.04em', transition: 'color 0.15s',
                      }}
                    >
                      {savedIds.has(source.id) ? 'Saved' : 'Save'}
                    </button>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  )
}
