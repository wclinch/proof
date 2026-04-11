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

interface SavedProject {
  id: string
  name: string
  sources: Source[]
  notes: string
  savedAt: number
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
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('proof_notes') ?? ''
  })
  const [projects, setProjects] = useState<SavedProject[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('proof_projects') ?? '[]') } catch { return [] }
  })
  const [projectName, setProjectName] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Untitled'
    return localStorage.getItem('proof_project_name') ?? 'Untitled'
  })
  const [showProjectList, setShowProjectList] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitting = useRef(false)
  const inProgress = useRef(new Set<string>())

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('proof_sources', JSON.stringify(sources)) } catch {}
  }, [sources])

  useEffect(() => {
    try { localStorage.setItem('proof_notes', notes) } catch {}
  }, [notes])

  useEffect(() => {
    try { localStorage.setItem('proof_projects', JSON.stringify(projects)) } catch {}
  }, [projects])

  useEffect(() => {
    try { localStorage.setItem('proof_project_name', projectName) } catch {}
  }, [projectName])

  function saveProject() {
    const name = projectName.trim() || 'Untitled'
    setProjectName(name)
    const project: SavedProject = {
      id: projects.find(p => p.name === name)?.id ?? crypto.randomUUID(),
      name,
      sources,
      notes,
      savedAt: Date.now(),
    }
    setProjects(prev => {
      const idx = prev.findIndex(p => p.name === name)
      return idx >= 0 ? prev.map((p, i) => i === idx ? project : p) : [...prev, project]
    })
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  function loadProject(p: SavedProject) {
    setSources(p.sources)
    setNotes(p.notes)
    setProjectName(p.name)
    setShowProjectList(false)
    setConfirmNew(false)
  }

  function newProject() {
    if (confirmNew) {
      setSources([])
      setNotes('')
      setProjectName('Untitled')
      setConfirmNew(false)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    } else {
      setConfirmNew(true)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmNew(false), 3000)
    }
  }

  function deleteProject(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  async function citeOne(trimmed: string): Promise<string | null> {
    if (!trimmed) return null
    const isDuplicate = sources.some(s => s.meta.url === trimmed || s.meta.doi === trimmed)
    if (isDuplicate || inProgress.current.has(trimmed)) return 'duplicate'
    inProgress.current.add(trimmed)
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
    } finally {
      inProgress.current.delete(trimmed)
    }
  }

  async function citeRaw(raw: string) {
    if (!raw.trim() || submitting.current) return
    submitting.current = true
    setLoading(true)
    setError('')

    try {
      const lines = raw.split(',').map(l => l.trim()).filter(Boolean)
      if (!lines.length) return

      if (lines.length > 1) {
        const results = await Promise.all(lines.map(citeOne))
        const duplicates = results.filter(e => e === 'duplicate').length
        const errors = results.filter(e => e && e !== 'duplicate') as string[]
        setInput('')
        setCopied(false)
        if (errors.length) setError(`${errors.length} source${errors.length > 1 ? 's' : ''} couldn't be added.`)
        else if (duplicates === lines.length) setError('Already in your list.')
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
    } finally {
      setLoading(false)
      submitting.current = false
    }
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
      htmlContent = `<html><body><p style="text-align:center;font-family:'Times New Roman',serif;font-size:12pt;">${listTitle}</p>${htmlCitations.map(c => `<p style="margin-left:2em;text-indent:-2em;font-family:'Times New Roman',serif;font-size:12pt;">${c}</p>`).join('')}</body></html>`
    } else {
      const inTextLines = sorted.map(s => {
        const inText = format === 'MLA' ? inTextMLA(s.meta) : format === 'APA' ? inTextAPA(s.meta) : inTextChicago(s.meta)
        return `${inText} — ${s.meta.title}`
      })
      plainText = `In-Text Citations\n\n` + inTextLines.join('\n')
      htmlContent = `<html><body><p style="text-align:center;font-family:'Times New Roman',serif;font-size:12pt;">In-Text Citations</p>${inTextLines.map(l => `<p style="font-family:'Times New Roman',serif;font-size:12pt;">${l}</p>`).join('')}</body></html>`
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
        }),
      ])
    } catch {
      try {
        await navigator.clipboard.writeText(plainText)
      } catch {
        setError('Clipboard access denied.')
        return
      }
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
    try {

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
    } catch {
      setError('Failed to generate .docx file.')
    }
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Nav />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '48px 20px',
        gap: '32px',
      }}>

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
                if (text.includes(',') && (text.match(/https?:\/\//g) ?? []).length > 1) {
                  e.preventDefault()
                  citeRaw(text.trim())
                }
              }}
              placeholder="Paste a source link or DOI..."
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
          Supports CSV bulk paste
        </p>

        {error && (
          <p style={{ fontSize: '13px', color: '#555', letterSpacing: '0.02em', maxWidth: '680px', width: '100%', marginTop: '-20px', marginBottom: '-20px', paddingLeft: '4px' }}>
            {error}
          </p>
        )}

        {/* Project bar */}
        <div style={{ width: '100%', maxWidth: '980px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '-16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              onFocus={() => setShowProjectList(true)}
              onBlur={() => setTimeout(() => setShowProjectList(false), 150)}
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: '11px', color: '#333', letterSpacing: '0.03em', width: '100%', cursor: 'text' }}
            />
            {showProjectList && projects.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', minWidth: '200px', zIndex: 10, overflow: 'hidden' }}>
                {projects.map(p => (
                  <div
                    key={p.id}
                    onMouseDown={() => loadProject(p)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '12px', color: '#555', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a' }}
                  >
                    <span>{p.name}</span>
                    <button
                      onMouseDown={e => deleteProject(p.id, e)}
                      style={{ background: 'none', border: 'none', color: '#2a2a2a', cursor: 'pointer', fontSize: '10px', padding: '0 0 0 8px' }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={saveProject}
            style={{ background: 'none', border: 'none', fontSize: '11px', color: saved ? '#555' : '#2a2a2a', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0, flexShrink: 0 }}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={newProject}
            style={{ background: 'none', border: 'none', fontSize: '11px', color: confirmNew ? '#555' : '#2a2a2a', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0, flexShrink: 0 }}
          >
            {confirmNew ? 'Confirm?' : 'New'}
          </button>
        </div>

        {/* Sources + output */}
        <div style={{ width: '100%', maxWidth: '980px', display: 'flex', gap: '12px', alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0, border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>

          {!sources.length && (
            <div style={{ borderBottom: '1px solid #1a1a1a', padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ fontSize: '13px', color: '#2a2a2a', letterSpacing: '0.02em' }}>Nothing here yet.</p>
              <p style={{ fontSize: '11px', color: '#222', letterSpacing: '0.02em' }}>Paste a source above to get started.</p>
            </div>
          )}

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
                {allCitations.map((c, i) => {
                  const origIndex = sources.findIndex(src => src === sorted[i])
                  return (
                    <div key={sorted[i].meta.doi ?? sorted[i].meta.url} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <p style={{
                        flex: 1, fontSize: '14px', color: '#aaa', lineHeight: 1.85,
                        fontFamily: 'Georgia, serif', letterSpacing: '0.01em',
                        margin: 0, paddingLeft: '2em', textIndent: '-2em',
                      }}>
                        {c}
                      </p>
                      <button
                        onClick={() => handleRemoveClick(origIndex)}
                        style={{ background: 'none', border: 'none', color: '#333', fontSize: '13px', cursor: 'pointer', flexShrink: 0, letterSpacing: '0.06em', textTransform: 'uppercase', paddingTop: '2px', width: '60px', textAlign: 'right' }}
                      >
                        {confirmDelete === origIndex ? 'confirm?' : '✕'}
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '20px 24px 24px', background: '#0d0d0d', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {sorted.map((s, i) => {
                  const inText = format === 'MLA' ? inTextMLA(s.meta) : format === 'APA' ? inTextAPA(s.meta) : inTextChicago(s.meta)
                  const origIndex = sources.findIndex(src => src === s)
                  return (
                    <div key={s.meta.doi ?? s.meta.url} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ fontSize: '14px', color: '#aaa', fontFamily: 'Georgia, serif', margin: 0, letterSpacing: '0.01em', lineHeight: 1.85 }}>
                          {inText}
                        </p>
                        <p style={{ fontSize: '11px', color: '#333', margin: 0, letterSpacing: '0.03em' }}>
                          {s.meta.title}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveClick(origIndex)}
                        style={{ background: 'none', border: 'none', color: '#333', fontSize: '13px', cursor: 'pointer', flexShrink: 0, letterSpacing: '0.06em', textTransform: 'uppercase', paddingTop: '2px', width: '60px', textAlign: 'right' }}
                      >
                        {confirmDelete === origIndex ? 'confirm?' : '✕'}
                      </button>
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

          {/* Notes panel */}
          <div style={{
            width: '260px', flexShrink: 0,
            border: '1px solid #1a1a1a', borderRadius: '10px',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes..."
              style={{
                flex: 1, width: '100%', minHeight: '200px',
                background: 'none', border: 'none', outline: 'none', resize: 'none',
                color: '#aaa', fontSize: '13px', lineHeight: 1.7,
                padding: '16px 20px', letterSpacing: '0.01em',
              }}
            />
          </div>

          </div>
      </main>

      <Footer />
    </div>
  )
}
