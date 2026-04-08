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
  const [requestNote, setRequestNote] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)

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
    setRequestSent(false)
    setRequestNote('')
    supabase
      .from('sources')
      .select('*')
      .eq('status', 'approved')
      .or(`topic.ilike.%${q}%,title.ilike.%${q}%`)
      .order('citation_count', { ascending: false })
      .then(({ data }) => {
        const results = data || []
        setResults(weightedShuffle(results))
        setLoading(false)
        supabase.from('search_logs').insert({ query: q, result_count: results.length, is_verified: !!userId }).then(({ error }) => { if (error) console.error('search_logs:', error.message) })
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
      const { error } = await supabase.from('saved_sources').delete().eq('user_id', userId).eq('source_id', sourceId)
      if (!error) setSavedIds(prev => { const s = new Set(prev); s.delete(sourceId); return s })
    } else {
      const { error } = await supabase.from('saved_sources').insert({ user_id: userId, source_id: sourceId })
      if (!error) setSavedIds(prev => new Set(prev).add(sourceId))
    }
  }

  async function submitTopicRequest() {
    if (requestLoading || requestSent) return
    setRequestLoading(true)
    const { error } = await supabase.from('topic_requests').insert({ query, note: requestNote || null })
    if (!error) setRequestSent(true)
    setRequestLoading(false)
  }

  function search(q: string) {
    if (!q.trim()) return
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
              Curated academic sources, organized by subject.
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
                onClick={() => { router.replace('/'); router.refresh() }}
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
              <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <span style={{ color: '#333', fontSize: '13px', letterSpacing: '0.04em' }}>
                  No sources found. Try a different topic.
                </span>
                {requestSent ? (
                  <span style={{ fontSize: '12px', color: '#555', letterSpacing: '0.04em' }}>
                    Request submitted. We'll prioritize this topic.
                  </span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '420px' }}>
                    <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Request this topic
                    </span>
                    <input
                      type="text"
                      value={requestNote}
                      onChange={e => setRequestNote(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitTopicRequest()}
                      placeholder="Any details? (optional)"
                      style={{
                        background: '#111', border: '1px solid #1e1e1e', borderRadius: '6px',
                        padding: '12px 16px', color: '#f0f0f0', fontSize: '13px', outline: 'none', width: '100%',
                      }}
                    />
                    <button
                      onClick={submitTopicRequest}
                      disabled={requestLoading}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'none', border: '1px solid #1e1e1e', borderRadius: '5px',
                        color: '#555', fontSize: '12px', padding: '8px 18px', cursor: 'pointer',
                        letterSpacing: '0.04em', opacity: requestLoading ? 0.5 : 1,
                      }}
                    >
                      {requestLoading ? 'Submitting...' : 'Submit request'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {results.map(source => (
              <div
                key={source.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '24px',
                  padding: '11px 0',
                  borderBottom: '1px solid #141414',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#e8e8e8')}
                    onClick={() => supabase.from('source_clicks').insert({ source_id: source.id, query, is_verified: !!userId }).then(({ error }) => { if (error) console.error('source_clicks:', error.message) })}
                  >
                    {source.title}
                  </a>
                  <span style={{ fontSize: '11px', color: '#2a2a2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {source.url}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', color: '#222', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{source.topic}</span>
                  {userId && (
                    <button
                      onClick={() => toggleSave(source.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: '11px', color: savedIds.has(source.id) ? '#888' : '#2a2a2a',
                        letterSpacing: '0.04em', transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                      onMouseLeave={e => (e.currentTarget.style.color = savedIds.has(source.id) ? '#888' : '#2a2a2a')}
                    >
                      {savedIds.has(source.id) ? 'Saved' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
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
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  )
}
