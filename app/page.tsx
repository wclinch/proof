'use client'

import { useState, useRef } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { formatMLA, formatAPA, formatChicago } from '@/lib/cite'
import type { CitationMeta } from '@/lib/cite'

type Format = 'MLA' | 'APA' | 'Chicago'

export default function Home() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState<CitationMeta | null>(null)
  const [format, setFormat] = useState<Format>('MLA')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitting = useRef(false)

  async function cite() {
    if (!input.trim() || submitting.current) return
    submitting.current = true
    setLoading(true)
    setError('')
    setMeta(null)
    setCopied(false)

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
        setMeta(data.meta)
      }
    } catch {
      setError('Something went wrong. Try again.')
    }

    setLoading(false)
    submitting.current = false
  }

  const citation = meta
    ? format === 'MLA' ? formatMLA(meta)
    : format === 'APA' ? formatAPA(meta)
    : formatChicago(meta)
    : ''

  function copy() {
    if (!citation) return
    navigator.clipboard.writeText(citation)
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  const hasResult = !!meta

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Nav />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: hasResult ? 'flex-start' : 'center',
        padding: hasResult ? '48px 20px' : '40px 20px',
        gap: '32px',
      }}>

        {!hasResult && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Cite anything.
            </h1>
            <p style={{ fontSize: '15px', color: '#555', letterSpacing: '0.02em' }}>
              Paste a DOI or URL — get MLA, APA, or Chicago instantly.
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
              placeholder="https://doi.org/10.1038/... or any URL"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#f0f0f0', fontSize: '15px', padding: '18px 0',
              }}
            />
            {input && (
              <button
                onClick={() => { setInput(''); setMeta(null); setError('') }}
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
            {loading ? 'Loading...' : 'Cite'}
          </button>
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: '#555', letterSpacing: '0.02em', maxWidth: '680px', width: '100%' }}>
            {error}
          </p>
        )}

        {/* Result */}
        {meta && (
          <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>

            {/* Source info */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', marginBottom: '4px', lineHeight: 1.4 }}>
                {meta.title}
              </p>
              <p style={{ fontSize: '11px', color: '#333', letterSpacing: '0.04em' }}>
                {[
                  meta.authors[0] ?? null,
                  meta.journal ?? meta.siteName ?? null,
                  meta.year ?? null,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>

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

            {/* Citation text */}
            <div style={{ padding: '24px', background: '#0d0d0d' }}>
              <p style={{
                fontSize: '14px', color: '#aaa', lineHeight: 1.85,
                fontFamily: 'Georgia, serif', letterSpacing: '0.01em',
              }}>
                {citation}
              </p>
            </div>

            {/* Copy + note */}
            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1a1a1a' }}>
              <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.03em' }}>
                Italicize journal/book titles before submitting.
              </span>
              <button
                onClick={copy}
                style={{
                  background: copied ? 'none' : '#f0f0f0',
                  color: copied ? '#555' : '#0a0a0a',
                  border: copied ? '1px solid #1e1e1e' : 'none',
                  borderRadius: '6px', padding: '8px 20px',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
