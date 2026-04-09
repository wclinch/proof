'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase'

type SavedSource = {
  id: string
  source_id: string
  sources: {
    id: string
    title: string
    url: string
    topic: string
    citation_count: number
    author: string | null
    published_date: string | null
    publisher: string | null
  }
}

type CiteFormat = 'MLA' | 'APA' | 'Chicago'

function formatMLA(s: SavedSource['sources']): string {
  const author = s.author ?? 'Author Unknown'
  const title = `"${s.title}."`
  const publisher = s.publisher ? s.publisher + ', ' : ''
  const year = s.published_date ? s.published_date.split('-')[0] : 'n.d.'
  const url = s.url ? ` <${s.url}>.` : '.'
  return `${author}. ${title} ${publisher}${year},${url}`
}

function formatAPA(s: SavedSource['sources']): string {
  const author = s.author ?? 'Author Unknown'
  const year = s.published_date ? s.published_date.split('-')[0] : 'n.d.'
  const publisher = s.publisher ? s.publisher + '. ' : ''
  const url = s.url ?? ''
  return `${author}. (${year}). ${s.title}. ${publisher}${url}`
}

function formatChicago(s: SavedSource['sources']): string {
  const author = s.author ?? 'Author Unknown'
  const title = `"${s.title}."`
  const publisher = s.publisher ? s.publisher + ', ' : ''
  const year = s.published_date ? s.published_date.split('-')[0] : 'n.d.'
  const url = s.url ? ` ${s.url}.` : ''
  return `${author}. ${title} ${publisher}${year}.${url}`
}

function CiteModal({ source, onClose }: { source: SavedSource['sources'], onClose: () => void }) {
  const [format, setFormat] = useState<CiteFormat>('MLA')
  const [copied, setCopied] = useState(false)

  const citation =
    format === 'MLA' ? formatMLA(source) :
    format === 'APA' ? formatAPA(source) :
    formatChicago(source)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function copy() {
    navigator.clipboard.writeText(citation)
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '10px',
          padding: '28px', width: '100%', maxWidth: '520px',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Cite Source
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '16px', padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#888', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {source.title}
        </p>

        {/* Format selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['MLA', 'APA', 'Chicago'] as CiteFormat[]).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              style={{
                background: format === f ? '#f0f0f0' : 'none',
                color: format === f ? '#0a0a0a' : '#444',
                border: '1px solid',
                borderColor: format === f ? '#f0f0f0' : '#1e1e1e',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: format === f ? 600 : 400,
                cursor: 'pointer',
                letterSpacing: '0.06em',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Citation text */}
        <div style={{
          background: '#111', border: '1px solid #1a1a1a', borderRadius: '6px',
          padding: '16px', fontSize: '13px', color: '#aaa', lineHeight: 1.8,
          fontFamily: 'Georgia, serif', letterSpacing: '0.01em',
        }}>
          {citation}
        </div>

        {/* Copy button */}
        <button
          onClick={copy}
          style={{
            background: copied ? 'none' : '#f0f0f0',
            color: copied ? '#555' : '#0a0a0a',
            border: copied ? '1px solid #1e1e1e' : 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            alignSelf: 'flex-start',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function Saved() {
  const router = useRouter()
  const [saved, setSaved] = useState<SavedSource[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [removeError, setRemoveError] = useState(false)
  const [citing, setCiting] = useState<SavedSource['sources'] | null>(null)
  const [filter, setFilter] = useState('')
  const closeCite = useCallback(() => setCiting(null), [])

  const filtered = filter.trim()
    ? saved.filter(s =>
        s.sources.title.toLowerCase().includes(filter.toLowerCase()) ||
        s.sources.topic.toLowerCase().includes(filter.toLowerCase())
      )
    : saved

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/signin')
        return
      }
      const { data: saved, error } = await supabase
        .from('saved_sources')
        .select('id, source_id, sources(id, title, url, topic, citation_count, author, published_date, publisher)')
        .eq('user_id', data.session.user.id)
        .order('created_at', { ascending: false })
      if (error) { setFetchError(true); setLoading(false); return }
      setSaved(((saved as unknown as SavedSource[]) ?? []).filter(s => s.sources != null))
      setLoading(false)
    })
  }, [router])

  async function removeSource(savedId: string) {
    setRemoveError(false)
    const { error } = await supabase.from('saved_sources').delete().eq('id', savedId)
    if (error) { setRemoveError(true); return }
    setSaved(prev => prev.filter(s => s.id !== savedId))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      {citing && <CiteModal source={citing} onClose={closeCite} />}

      <main style={{ flex: 1, maxWidth: '680px', width: '100%', margin: '0 auto', padding: '48px 20px', display: 'flex', flexDirection: 'column', gap: '0' }}>

        <div style={{ paddingBottom: '20px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
            Saved Sources
          </span>
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by title or topic..."
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: '#888', fontSize: '12px', letterSpacing: '0.02em',
              flex: 1,
            }}
          />
          <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.06em', flexShrink: 0 }}>
            {loading ? '' : `${saved.length} saved`}
          </span>
        </div>

        {loading && (
          <div style={{ padding: '40px 0', color: '#2a2a2a', fontSize: '13px', letterSpacing: '0.04em' }}>
            Loading...
          </div>
        )}

        {!loading && fetchError && (
          <div style={{ padding: '40px 0', color: '#555', fontSize: '13px', letterSpacing: '0.04em' }}>
            Couldn't load saved sources. Try refreshing.
          </div>
        )}

        {!loading && !fetchError && saved.length === 0 && (
          <div style={{ padding: '40px 0', color: '#2a2a2a', fontSize: '13px', letterSpacing: '0.04em' }}>
            No sources saved.
          </div>
        )}

        {removeError && (
          <div style={{ padding: '8px 0', color: '#555', fontSize: '12px', letterSpacing: '0.04em' }}>
            Couldn't remove source. Try again.
          </div>
        )}

        {filtered.map(item => (
          <div key={item.id} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            padding: '12px 0',
            borderBottom: '1px solid #141414',
          }}>
            <a
              href={item.sources.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, textDecoration: 'none', flex: 1, color: '#e8e8e8', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#888')}
              onMouseLeave={e => (e.currentTarget.style.color = '#e8e8e8')}
            >
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.sources.title}
              </span>
              <span style={{ fontSize: '11px', color: '#2e2e2e' }}>
                {item.sources.url}
              </span>
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
              <span style={{ fontSize: '10px', color: '#222', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {item.sources.topic}
              </span>
              <button
                onClick={() => setCiting(item.sources)}
                style={{
                  background: 'none', border: 'none', color: '#2a2a2a',
                  fontSize: '11px', cursor: 'pointer', letterSpacing: '0.04em',
                  padding: 0, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
              >
                Cite
              </button>
              <button
                onClick={() => removeSource(item.id)}
                style={{
                  background: 'none', border: 'none', color: '#2a2a2a',
                  fontSize: '11px', cursor: 'pointer', letterSpacing: '0.04em',
                  padding: 0, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </main>

      <Footer />
    </div>
  )
}
