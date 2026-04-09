'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase'

export default function Educators() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    institution: '',
    subject: '',
    bibliography: '',
    topic: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.name || !form.email || !form.institution || !form.subject) {
      setError('Please fill in all required fields.')
      return
    }
    const domain = form.email.split('@')[1] ?? ''
    if (!domain.endsWith('.edu') && !domain.endsWith('.gov') && !domain.endsWith('.ac.uk') && !domain.endsWith('.edu.au')) {
      setError('Only institutional email addresses are accepted (.edu, .gov, .ac.uk, .edu.au).')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.from('contributor_applications').insert({
      name: form.name,
      email: form.email,
      institution: form.institution,
      subject: form.subject,
      bibliography: form.bibliography || null,
      topic: form.topic || null,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  const inputStyle = {
    background: '#111', border: '1px solid #1e1e1e', borderRadius: '6px',
    padding: '14px 16px', color: '#f0f0f0', fontSize: '14px', outline: 'none',
    width: '100%', fontFamily: 'inherit',
  }

  const labelStyle = {
    fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em' }}>Application received</h1>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
              We'll review your application and reach out to <span style={{ color: '#888' }}>{form.email}</span> within a few days.
            </p>
          </div>
        </main>
      <Footer />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{ flex: 1, maxWidth: '520px', width: '100%', margin: '0 auto', padding: '56px 20px', display: 'flex', flexDirection: 'column', gap: '0' }}>

        <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          Contribute
        </span>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em' }}>Apply to contribute sources</h1>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            Proof maintains a curated database of academic sources. Researchers, academics, and subject-matter experts may apply to contribute. All submissions are reviewed prior to publication.
          </p>
        </div>

        <div style={{ paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={labelStyle}>Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Dr. Jane Smith"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Institution Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="you@university.edu or you@agency.gov"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Institution *</label>
            <input
              type="text"
              value={form.institution}
              onChange={e => update('institution', e.target.value)}
              placeholder="University of California, Davis"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Subject / Area of Expertise *</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => update('subject', e.target.value)}
              placeholder="History, Political Science, Biology..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Sources to contribute (optional)</label>
            <textarea
              value={form.bibliography}
              onChange={e => update('bibliography', e.target.value)}
              placeholder="Paste a list of sources you'd like to contribute. We'll review and add them if they meet our standards."
              rows={5}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Topic area (optional)</label>
            <input
              type="text"
              value={form.topic}
              onChange={e => update('topic', e.target.value)}
              placeholder="e.g. Civil Rights Movement"
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: '#888888', letterSpacing: '0.02em' }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: '#f0f0f0', color: '#0a0a0a', border: 'none', borderRadius: '6px',
              padding: '14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              letterSpacing: '0.04em', marginTop: '4px', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Submitting...' : 'Submit application'}
          </button>

          <p style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.03em', lineHeight: 1.6 }}>
            Applications are reviewed manually. We'll contact you at your institution email within a few days.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
