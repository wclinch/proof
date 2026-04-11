'use client'

import { useState, useRef, useEffect } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { formatMLA, formatAPA, formatChicago, formatMLAHtml, formatAPAHtml, formatChicagoHtml, inTextMLA, inTextAPA, inTextChicago } from '@/lib/cite'
import type { CitationMeta } from '@/lib/cite'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'

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
  const [view, setView] = useState<'works-cited' | 'in-text'>('works-cited')
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitting = useRef(false)

  useEffect(() => {
    try { localStorage.setItem('proof_sources', JSON.stringify(sources)) } catch {}
  }, [sources])

  async function citeOne(trimmed: string): Promise<string | null> {
    if (!trimmed) return null
    const isDuplicate = sources.some(s => s.meta.url === trimmed || s.meta.doi === trimmed)
    if (isDuplicate) return 'duplicate'
    try {
      const res = await fetch('/api/cite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed }),
      })
      const data = await res.json()
      if (!res.ok || data.error) return data.error ?? 'Could not retrieve metadata.'
      setSources(prev => [...prev, { meta: data.meta, logId: data.logId ?? null }])
      return null
    } catch {
      return 'Something went wrong.'
    }
  }

  async function citeRaw(raw: string) {
    if (!raw.trim() || submitting.current) return
    submitting.current = true
    setLoading(true)
    setError('')

    const lines = raw
      .split(/[\n,]+/)
      .flatMap(segment => segment.split(/(?=https?:\/\/)/))
      .map(l => l.trim())
      .filter(Boolean)

    if (lines.length > 1) {
      const errors = (await Promise.all(lines.map(citeOne))).filter(e => e && e !== 'duplicate') as string[]
      setInput('')
      setCopied(false)
      if (errors.length) setError(`${errors.length} source${errors.length > 1 ? 's' : ''} couldn't be added.`)
    } else {
      const err = await citeOne(lines[0])
      if (err === 'duplicate') {
        setError('This source is already in your list.')
      } else if (err) {
        setError(err)
      } else {
        setInput('')
        setCopied(false)
      }
    }

    setLoading(false)
    submitting.current = false
  }

  function cite() { citeRaw(input) }

  function handleRemoveClick(index: number) {
    if (confirmDelete === index) {
      setSources(prev => prev.filter((_, i) => i !== index))
      setConfirmDelete(null)
      setCopied(false)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    } else {
      setConfirmDelete(index)
      setConfirmClear(false)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  function handleClearClick() {
    if (confirmClear) {
      setSources([])
      setConfirmClear(false)
      setCopied(false)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    } else {
      setConfirmClear(true)
      setConfirmDelete(null)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmClear(false), 3000)
    }
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

    let plainText: string
    let htmlContent: string

    if (view === 'works-cited') {
      const htmlCitations = sorted.map(s =>
        format === 'MLA' ? formatMLAHtml(s.meta)
        : format === 'APA' ? formatAPAHtml(s.meta)
        : formatChicagoHtml(s.meta)
      )
      plainText = `${listTitle}\n\n` + allCitations.join('\n\n')
      htmlContent = `<html><body><p><strong>${listTitle}</strong></p>${htmlCitations.map(c => `<p style="margin-left:2em;text-indent:-2em;font-family:Georgia,serif;">${c}</p>`).join('')}</body></html>`
    } else {
      const inTextLines = sorted.map(s => {
        const inText = format === 'MLA' ? inTextMLA(s.meta) : format === 'APA' ? inTextAPA(s.meta) : inTextChicago(s.meta)
        return `${inText} — ${s.meta.title}`
      })
      plainText = `In-Text Citations\n\n` + inTextLines.join('\n')
      htmlContent = `<html><body><p><strong>In-Text Citations</strong></p>${inTextLines.map(l => `<p style="font-family:Georgia,serif;">${l}</p>`).join('')}</body></html>`
    }

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

  function htmlToRuns(html: string): TextRun[] {
    return html.split(/(<em>.*?<\/em>)/g).filter(Boolean).map(part => {
      const isItalic = part.startsWith('<em>')
      const text = part
        .replace(/<\/?em>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
      return new TextRun({ text, italics: isItalic, font: 'Times New Roman', size: 24 })
    })
  }

  async function downloadDocx() {
    if (!sorted.length) return

    let children: Paragraph[]
    let filename: string

    if (view === 'works-cited') {
      children = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: 480, after: 0 },
          children: [new TextRun({ text: listTitle, font: 'Times New Roman', size: 24 })],
        }),
        ...sorted.map(s => {
          const html = format === 'MLA' ? formatMLAHtml(s.meta)
            : format === 'APA' ? formatAPAHtml(s.meta)
            : formatChicagoHtml(s.meta)
          return new Paragraph({
            spacing: { line: 480, before: 0, after: 0 },
            indent: { left: 720, hanging: 720 },
            children: htmlToRuns(html),
          })
        }),
      ]
      filename = `${listTitle.toLowerCase().replace(/ /g, '-')}.docx`
    } else {
      children = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: 480, after: 0 },
          children: [new TextRun({ text: 'In-Text Citations', font: 'Times New Roman', size: 24 })],
        }),
        ...sorted.map(s => {
          const inText = format === 'MLA' ? inTextMLA(s.meta) : format === 'APA' ? inTextAPA(s.meta) : inTextChicago(s.meta)
          return new Paragraph({
            spacing: { line: 480, before: 0, after: 0 },
            children: [
              new TextRun({ text: inText, font: 'Times New Roman', size: 24 }),
              new TextRun({ text: `  —  ${s.meta.title}`, font: 'Times New Roman', size: 24, color: '888888' }),
            ],
          })
        }),
      ]
      filename = 'in-text-citations.docx'
    }

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      }],
    })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
              onPaste={e => {
                const text = e.clipboardData.getData('text')
                const hasMultiple = text.includes('\n') || text.includes(',') ||
                  (text.match(/https?:\/\//g) ?? []).length > 1
                if (hasMultiple) {
                  e.preventDefault()
                  citeRaw(text.trim())
                }
              }}
              placeholder={hasSources ? 'Add sources... (paste multiple links at once)' : 'Paste one or more source links or DOIs...'}
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

        <p style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.03em', maxWidth: '680px', width: '100%', marginTop: '-24px', paddingLeft: '4px' }}>
          URLs or DOIs — one per line, comma-separated, or pasted together
        </p>

        {error && (
          <p style={{ fontSize: '13px', color: '#555', letterSpacing: '0.02em', maxWidth: '680px', width: '100%', marginTop: '-20px', marginBottom: '-20px', paddingLeft: '4px' }}>
            {error}
          </p>
        )}

        {/* Sources + output */}
        {hasSources && (
          <div style={{ width: '100%', maxWidth: '680px', border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>

            {/* Source list */}
            {sources.map((s, i) => (
              <div key={s.meta.doi ?? s.meta.url} style={{
                padding: '14px 20px',
                borderBottom: '1px solid #1a1a1a',
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
                  onClick={() => handleRemoveClick(i)}
                  style={{ background: 'none', border: 'none', color: '#333', fontSize: '11px', cursor: 'pointer', flexShrink: 0, lineHeight: 1, letterSpacing: '0.06em', textTransform: 'uppercase', width: '54px', textAlign: 'right' }}
                >
                  {confirmDelete === i ? 'confirm?' : '✕'}
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

            {/* View tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a' }}>
              {(['works-cited', 'in-text'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => { setView(v); setCopied(false) }}
                  style={{
                    flex: 1, background: view === v ? '#141414' : 'none',
                    border: 'none', borderRight: v === 'works-cited' ? '1px solid #1a1a1a' : 'none',
                    color: view === v ? '#aaa' : '#2a2a2a',
                    fontSize: '11px', fontWeight: view === v ? 600 : 400,
                    padding: '12px', cursor: 'pointer',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    transition: 'color 0.15s',
                  }}
                >
                  {v === 'works-cited' ? listTitle : 'In-Text'}
                </button>
              ))}
            </div>

            {view === 'works-cited' ? (
              <div style={{ padding: '20px 24px 24px', background: '#0d0d0d', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {allCitations.map((c, i) => (
                  <p key={sorted[i].meta.doi ?? sorted[i].meta.url} style={{
                    fontSize: '14px', color: '#aaa', lineHeight: 1.85,
                    fontFamily: 'Georgia, serif', letterSpacing: '0.01em',
                    margin: 0, paddingLeft: '2em', textIndent: '-2em',
                  }}>
                    {c}
                  </p>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 24px 24px', background: '#0d0d0d', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {sorted.map((s, i) => {
                  const inText = format === 'MLA' ? inTextMLA(s.meta) : format === 'APA' ? inTextAPA(s.meta) : inTextChicago(s.meta)
                  return (
                    <div key={s.meta.doi ?? s.meta.url} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <p style={{ fontSize: '14px', color: '#aaa', fontFamily: 'Georgia, serif', margin: 0, letterSpacing: '0.01em', lineHeight: 1.85 }}>
                        {inText}
                      </p>
                      <p style={{ fontSize: '11px', color: '#333', margin: '0 0 2px', letterSpacing: '0.03em' }}>
                        {s.meta.title}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Copy all */}
            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '11px', color: '#333', letterSpacing: '0.03em' }}>
                  {sources.length} source{sources.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleClearClick}
                  style={{ background: 'none', border: 'none', fontSize: '11px', color: '#333', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0 }}
                >
                  {confirmClear ? 'Confirm?' : 'Clear All'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={downloadDocx}
                  style={{
                    background: 'none', color: '#555',
                    border: '1px solid #1e1e1e',
                    borderRadius: '6px', padding: '8px 20px',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}
                >
                  Export .docx
                </button>
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

          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
