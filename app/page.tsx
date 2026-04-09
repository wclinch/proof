'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
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

type HarvestWork = {
  title: string
  authorships: Array<{ author: { display_name: string } }>
  primary_location: { source?: { display_name: string }; landing_page_url?: string; pdf_url?: string } | null
  publication_year: number
  cited_by_count: number
  open_access: { oa_url?: string }
}

function hUrl(w: HarvestWork): string {
  const candidates = [w.open_access?.oa_url, w.primary_location?.landing_page_url, w.primary_location?.pdf_url]
  for (const u of candidates) {
    if (!u) continue
    try { new URL(u); return u } catch {}
  }
  return ''
}

const CURRENT_YEAR = new Date().getFullYear()

function hVelocity(w: HarvestWork) {
  const age = Math.max(CURRENT_YEAR - (w.publication_year || CURRENT_YEAR), 1)
  return (w.cited_by_count || 0) / age
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

function hAuthors(authorships: HarvestWork['authorships']): string {
  const names = authorships.map(a => (a.author?.display_name || '').split(' ').at(-1)).filter(Boolean) as string[]
  if (!names.length) return ''
  if (names.length > 3) return names.slice(0, 3).join(', ') + ' et al.'
  return names.join(', ')
}

function HarvestRow({ work, query, userId }: { work: HarvestWork; query: string; userId: string | null }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [alreadyInProof, setAlreadyInProof] = useState(false)
  const url = hUrl(work)
  const authors = hAuthors(work.authorships)
  const journal = work.primary_location?.source?.display_name || ''
  const meta = [authors, journal, work.publication_year].filter(Boolean).join(' · ')

  useEffect(() => {
    if (!url) return
    supabase.from('sources').select('id').eq('url', url).eq('status', 'approved').maybeSingle()
      .then(({ data }) => { if (data) setAlreadyInProof(true) })
  }, [url])

  async function submit() {
    setSubmitting(true)
    setSubmitError(false)
    // upsert — if URL already suggested, increment count instead of duplicate insert
    const { data: existing } = await supabase
      .from('topic_requests').select('id, suggestion_count').eq('url', url).maybeSingle()
    let error
    if (existing) {
      ;({ error } = await supabase.from('topic_requests')
        .update({ suggestion_count: (existing.suggestion_count || 1) + 1 })
        .eq('id', existing.id))
    } else {
      ;({ error } = await supabase.from('topic_requests').insert({
        query, url, suggested_title: work.title, note: note || null, suggestion_count: 1,
        user_id: userId || null,
      }))
    }
    if (error) { setSubmitError(true) } else { setSent(true) }
    setSubmitting(false)
  }

  return (
    <div style={{ padding: '11px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#888')}
            onMouseLeave={e => (e.currentTarget.style.color = '#e8e8e8')}
          >
            {stripHtml(work.title)}
          </a>
          <span style={{ fontSize: '11px', color: '#2a2a2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta}
          </span>
        </div>
        <div style={{ flexShrink: 0 }}>
          {alreadyInProof ? (
            <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.04em' }}>In Proof</span>
          ) : sent ? (
            <span style={{ fontSize: '11px', color: '#888', letterSpacing: '0.04em' }}>Submitted</span>
          ) : !userId ? (
            <a href="/signin" style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.04em', textDecoration: 'none' }}>Sign in to suggest</a>
          ) : (
            <button
              onClick={() => setOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.04em', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#888')}
              onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
            >
              {open ? 'Cancel' : 'Suggest'}
            </button>
          )}
        </div>
      </div>

      {open && !sent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Additional comments (optional)"
              maxLength={500}
              style={{
                flex: 1, background: '#111', border: '1px solid #161616', borderRadius: '5px',
                padding: '9px 12px', color: '#f0f0f0', fontSize: '12px', outline: 'none',
              }}
            />
            <button
              onClick={submit}
              disabled={submitting}
              style={{
                background: 'none', border: '1px solid #1a1a1a', borderRadius: '5px',
                color: '#444', fontSize: '12px', padding: '8px 14px', cursor: 'pointer',
                letterSpacing: '0.04em', flexShrink: 0, opacity: submitting ? 0.5 : 1,
              }}
            >
              Submit
            </button>
          </div>
          {submitError && (
            <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.02em' }}>
              Couldn't submit. Try again.
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function HomeInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Source[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const [reportingIds, setReportingIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [userDomain, setUserDomain] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(20)
  const [topics, setTopics] = useState<string[]>([])
  const [harvestResults, setHarvestResults] = useState<HarvestWork[]>([])
  const [harvestLoading, setHarvestLoading] = useState(false)
  const [harvestOpen, setHarvestOpen] = useState(false)
  const [harvestError, setHarvestError] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null
      const domain = data.session?.user?.email?.split('@')[1] ?? null
      setUserId(uid)
      setUserDomain(domain)
      if (uid) fetchSaved(uid)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserId(null)
        setUserDomain(null)
        setSavedIds(new Set())
      } else if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id)
        setUserDomain(session.user.email?.split('@')[1] ?? null)
        fetchSaved(session.user.id)
      }
    })
    fetchTopics()
    return () => listener.subscription.unsubscribe()
  }, [])

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
    setSearchError(false)
    setVisibleCount(20)
    setHarvestOpen(false)
    setHarvestResults([])
    setHarvestError(false)
    const esc = q.replace(/%/g, '\\%').replace(/_/g, '\\_')
    supabase
      .from('sources')
      .select('*')
      .eq('status', 'approved')
      .or(`topic.ilike.%${esc}%,title.ilike.%${esc}%`)
      .order('citation_count', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setSearchError(true); setLoading(false); return }
        const results = data || []
        const shuffled = weightedShuffle(results)
        setResults(shuffled)
        setLoading(false)
        supabase.from('search_logs').insert({ query: q, result_count: results.length, is_verified: !!userId, user_domain: userDomain, user_id: userId ?? null }).then(({ error }) => { if (error) console.error('search_logs:', error.message) }).catch(() => {})
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

  async function checkSession() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) setUserId(null)
  }

  async function toggleSave(sourceId: string) {
    if (!userId || savingIds.has(sourceId)) return
    setSaveError(false)
    setSavingIds(prev => new Set(prev).add(sourceId))
    if (savedIds.has(sourceId)) {
      const { error } = await supabase.from('saved_sources').delete().eq('user_id', userId).eq('source_id', sourceId)
      if (error) { await checkSession(); setSaveError(true) }
      else setSavedIds(prev => { const s = new Set(prev); s.delete(sourceId); return s })
    } else {
      const { error } = await supabase.from('saved_sources').insert({ user_id: userId, source_id: sourceId })
      if (error) { await checkSession(); setSaveError(true) }
      else setSavedIds(prev => new Set(prev).add(sourceId))
    }
    setSavingIds(prev => { const s = new Set(prev); s.delete(sourceId); return s })
  }

  async function searchHarvest(q?: string) {
    if (harvestLoading) return
    setHarvestOpen(true)
    setHarvestLoading(true)
    const searchQuery = q ?? query
    const params = new URLSearchParams({
      filter: `title.search:${searchQuery},type:article,from_publication_date:2010-01-01,open_access.is_oa:true`,
      select: 'title,authorships,primary_location,publication_year,cited_by_count,open_access',
      'per-page': '50',
      sort: 'relevance_score:desc',
      mailto: 'proof_dev@protonmail.com',
    })
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const resp = await fetch(`https://api.openalex.org/works?${params}`, { signal: controller.signal })
      clearTimeout(timeout)
      if (!resp.ok) throw new Error(`API error ${resp.status}`)
      const data = await resp.json()
      const valid = (data.results || []).filter((w: HarvestWork) => hUrl(w))
      const ranked = valid.sort((a: HarvestWork, b: HarvestWork) => hVelocity(b) - hVelocity(a)).slice(0, 10)
      setHarvestResults(ranked)
      if (!ranked.length) setHarvestError(true)
    } catch (e) {
      setHarvestError(true)
    }
    setHarvestLoading(false)
  }

  function search(q: string) {
    if (!q.trim() || q.trim().length < 2) return
    router.push(`/?q=${encodeURIComponent(q)}`, { scroll: false })
    setHarvestOpen(false)
    setHarvestResults([])
    setHarvestError(false)
  }

  const visibleResults = useMemo(() => results.slice(0, visibleCount), [results, visibleCount])

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Nav />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: searched ? 'flex-start' : 'center',
        padding: searched ? '48px 20px' : '40px 20px',
        gap: '20px',
      }}>
        {!searched && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
              Research, verified.
            </h1>
            <p style={{ fontSize: '15px', color: '#555', letterSpacing: '0.02em', margin: 0 }}>
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
              maxLength={200}
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
              {loading ? 'Searching...' : searchError ? 'Something went wrong. Try again.' : `${results.length} sources found`}
            </div>

            {!loading && results.length === 0 && (
              <div style={{ padding: '24px 0', fontSize: '13px', color: '#444', letterSpacing: '0.04em' }}>
                No sources found. Try a different topic.
              </div>
            )}

            {visibleResults.map(source => (
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
                    onClick={() => supabase.from('source_clicks').insert({ source_id: source.id, query, is_verified: !!userId, user_domain: userDomain }).then(({ error }) => { if (error) console.error('source_clicks:', error.message) }).catch(() => {})}
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
                  {reportedIds.has(source.id) ? (
                    <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.04em' }}>Reported</span>
                  ) : (
                    <button
                      onClick={async () => {
                        if (reportingIds.has(source.id)) return
                        setReportingIds(prev => new Set(prev).add(source.id))
                        const { error } = await supabase.from('source_reports').insert({ source_id: source.id, query })
                        if (!error) setReportedIds(prev => new Set(prev).add(source.id))
                        setReportingIds(prev => { const s = new Set(prev); s.delete(source.id); return s })
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.04em', transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
                    >
                      Report
                    </button>
                  )}
                </div>
              </div>
            ))}
            {saveError && (
              <div style={{ padding: '10px 0', fontSize: '12px', color: '#555', letterSpacing: '0.04em' }}>
                Couldn't save. Try again.
              </div>
            )}

            {results.length > visibleCount && (
              <button
                onClick={() => setVisibleCount(c => c + 20)}
                style={{
                  alignSelf: 'flex-start', background: 'none', border: 'none',
                  color: '#2a2a2a', fontSize: '11px', cursor: 'pointer',
                  letterSpacing: '0.06em', padding: '16px 0 4px', transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
              >
                Load more ({results.length - visibleCount} remaining)
              </button>
            )}

            {!loading && !searchError && (
              <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '0' }}>
                {!harvestOpen && (
                  <button
                    onClick={() => searchHarvest()}
                    disabled={harvestLoading}
                    style={{
                      alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0,
                      fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.08em',
                      textTransform: 'uppercase', cursor: harvestLoading ? 'default' : 'pointer',
                      transition: 'color 0.15s', opacity: harvestLoading ? 0.4 : 1,
                    }}
                    onMouseEnter={e => { if (!harvestLoading) e.currentTarget.style.color = '#888' }}
                    onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
                  >
                    Search with Harvest
                  </button>
                )}

                {harvestOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    <div style={{
                      fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.08em',
                      textTransform: 'uppercase', paddingBottom: '12px',
                      borderBottom: '1px solid #1a1a1a',
                    }}>
                      {harvestLoading ? 'Searching OpenAlex...' : harvestError && !harvestResults.length ? 'OpenAlex unavailable. Try again later.' : `${harvestResults.length} results from OpenAlex`}
                    </div>

                    {harvestResults.map((w, i) => (
                      <HarvestRow key={`${w.title}-${i}`} work={w} query={query} userId={userId} />
                    ))}

                    {!harvestLoading && (
                      <span style={{ fontSize: '10px', color: '#222', letterSpacing: '0.06em', paddingTop: '14px' }}>
                        Powered by OpenAlex — open.alex.org
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
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
