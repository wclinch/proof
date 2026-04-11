'use client'

import { useState, useRef, useEffect } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { formatMLA, formatAPA, formatChicago, formatMLAHtml, formatAPAHtml, formatChicagoHtml } from '@/lib/cite'
import type { CitationMeta } from '@/lib/cite'

type Format = 'MLA' | 'APA' | 'Chicago'

interface Source {
  meta: CitationMeta
  logId: string | null
}

function sortSources(sources: Source[]): Source[] {
  return [...sources].sort((a, b) => {
    const keyA = a.meta.authors[0]?.split(',')[0].trim() || a.meta.title
    const keyB = b.meta.authors[0]?.split(',')[0].trim() || b.meta.title
    return keyA.localeCompare(keyB)
  })
}

export default function Home() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sources, setSources] = useState<Source[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('proof_sources') ?? '[]') } catch { return [] }
  })
  const [format, setFormat] = useState<Format>('MLA')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitting = useRef(false)

  useEffect(() => {
    try { localStorage.setItem('proof_sources', JSON.stringify(sources)) } catch {}
  }, [sources])

  async function cite() {
    if (!input.trim() || submitting.current) return
    submitting.current = true
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/cite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Could not retrieve metadata. Check the DOI or URL and try again.')
      } else {
        setSources(prev => [...prev, { meta: data.meta, logId: data.logId ?? null }])
        setInput('')
        setCopied(false)
      }
    } catch {
      setError('Something went wrong. Try again.')
    }

    setLoading(false)
    submitting.current = false
  }

  function removeSource(index: number) {
    setSources(prev => prev.filter((_, i) => i !== index))
    setCopied(false)
  }

  const sorted = sortSources(sources)
  const listTitle = format === 'MLA' ? 'Works Cited' : format === 'APA' ? 'References' : 'Bibliography'

  const allCitations = sorted.map(s =>
    format === 'MLA' ? formatMLA(s.meta)
    : format === 'APA' ? formatAPA(s.meta)
    : formatChicago(s.meta)
  )

  async function copyAll() {
    if (!allCitations.length) return

    const plainText = `${listTitle}\n\n` + allCitations.join('\n\n')

    const htmlCitations = sorted.map(s =>
      format === 'MLA' ? formatMLAHtml(s.meta)
      : format === 'APA' ? formatAPAHtml(s.meta)
      : formatChicagoHtml(s.meta)
    )
    const htmlContent = `<html><body><p><strong>${listTitle}</strong></p>${htmlCitations.map(c => `<p style="margin-left:2em;text-indent:-2em;font-family:Georgia,serif;">${c}</p>`).join('')}</body></html>`

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
        }),
      ])
    } catch {
      await navigator.clipboard.writeText(plainText)
    }

    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2000)
    sorted.forEach(s => {
      if (s.logId) {
        fetch('/api/log-copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logId: s.logId, format }),
        }).catch(() => {})
      }
    })
  }

  const hasSources = sources.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Nav />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: hasSources ? 'flex-start' : 'center',
        padding: hasSources ? '48px 20px' : '40px 20px',
        gap: '32px',
      }}>

        {!hasSources && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Cite anything.
            </h1>
            <p style={{ fontSize: '15px', color: '#555', letterSpacing: '0.02em' }}>
              MLA. APA. Chicago. No ads, no sign-up, no friction.
            </p>
          </div>
        )}

        {/* Input */}
        <div style={{ width: '100%', maxWidth: '680px', display: 'flex', gap: '10px' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: '#111',
            border: '1px solid #222',
            borderRadius: '8px',
            padding: '0 20px',
          }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && cite()}
              placeholder={hasSources ? 'Add another source...' : 'Paste a source link or DOI...'}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#f0f0f0', fontSize: '15px', padding: '18px 0',
              }}
            />
            {input && (
              <button
                onClick={() => { setInput(''); setError('') }}
                style={{ background: 'none', border: 'none', color: '#333', fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
              >
                ×
              </button>
            )}
          </div>
          <button
            onClick={cite}
            disabled={loading}
            style={{
              background: '#f0f0f0', color: '#0a0a0a', border: 'none',
              borderRadius: '8px', padding: '0 24px', fontSize: '13px',
              fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              letterSpacing: '0.04em', opacity: loading ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Loading...' : 'Add'}
          </button>
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: '#555', letterSpacing: '0.02em', maxWidth: '680px', width: '100%' }}>
            {error}
          </p>
        )}

        {/* Sources + output */}
        {hasSources && (
          <div style={{ width: '100%', maxWidth: '680px', border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>

            {/* Source list */}
            {sources.map((s, i) => (
              <div key={i} style={{
                padding: '14px 20px',
                borderBottom: '1px solid #141414',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', color: '#e8e8e8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.meta.title}
                  </p>
                  <p style={{ fontSize: '11px', color: '#333', margin: 0, letterSpacing: '0.03em' }}>
                    {[s.meta.authors[0] ?? null, s.meta.year ?? null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => removeSource(i)}
                  style={{ background: 'none', border: 'none', color: '#2a2a2a', fontSize: '16px', cursor: 'pointer', flexShrink: 0, lineHeight: 1, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#666')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
                >
                  ×
                </button>
              </div>
            ))}

            {/* Format tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a' }}>
              {(['MLA', 'APA', 'Chicago'] as Format[]).map(f => (
                <button
                  key={f}
                  onClick={() => { setFormat(f); setCopied(false) }}
                  style={{
                    flex: 1, background: format === f ? '#141414' : 'none',
                    border: 'none', borderRight: f !== 'Chicago' ? '1px solid #1a1a1a' : 'none',
                    color: format === f ? '#f0f0f0' : '#333',
                    fontSize: '11px', fontWeight: format === f ? 600 : 400,
                    padding: '12px', cursor: 'pointer',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    transition: 'color 0.15s',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Works cited label */}
            <div style={{ padding: '20px 24px 0', background: '#0d0d0d' }}>
              <p style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                {listTitle}
              </p>
            </div>

            {/* Citations */}
            <div style={{ padding: '16px 24px 24px', background: '#0d0d0d', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {allCitations.map((c, i) => (
                <p key={i} style={{
                  fontSize: '14px', color: '#aaa', lineHeight: 1.85,
                  fontFamily: 'Georgia, serif', letterSpacing: '0.01em',
                  margin: 0,
                  paddingLeft: '2em',
                  textIndent: '-2em',
                }}>
                  {c}
                </p>
              ))}
            </div>

            {/* Copy all */}
            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.03em' }}>
                  {sources.length} source{sources.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => { setSources([]); setCopied(false) }}
                  style={{ background: 'none', border: 'none', fontSize: '11px', color: '#2a2a2a', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#666')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
                >
                  Clear
                </button>
              </div>
              <button
                onClick={copyAll}
                style={{
                  background: copied ? 'none' : '#f0f0f0',
                  color: copied ? '#555' : '#0a0a0a',
                  border: copied ? '1px solid #1e1e1e' : 'none',
                  borderRadius: '6px', padding: '8px 20px',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
              >
                {copied ? 'Copied' : 'Copy All'}
              </button>
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
