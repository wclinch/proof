import Link from 'next/link'

const FEATURES = [
  {
    label: 'Breakdown',
    desc: 'Every source becomes structured data — authors, abstract, sample, methodology, statistics, findings, conclusions, direct quotes, limitations, concepts, and keywords.',
  },
  {
    label: 'Source view',
    desc: 'The full original text sits alongside the breakdown. Click Find in source on any extracted item and Proof scrolls to the exact passage, highlighted in green.',
  },
  {
    label: 'Synthesis',
    desc: 'Write in the same window. Your sources stay beside you. Export your draft as .txt or .md when done.',
  },
  {
    label: 'Citation ledger',
    desc: 'Drag any analyzed source into your reference list. Switch between MLA, APA, and Chicago. Full entry and in-text parenthetical — both copyable.',
  },
  {
    label: 'Projects',
    desc: 'Organize work into separate projects, each with its own source list, synthesis, and ledger. Export everything as a JSON backup and restore it on any device.',
  },
]

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{
        padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <span style={{ fontSize: '22px', fontWeight: 300, color: '#e8e8e8' }}>{`{`}</span>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/about"   style={{ fontSize: '12px', color: '#444', textDecoration: 'none', letterSpacing: '0.06em' }}>About</Link>
          <Link href="/privacy" style={{ fontSize: '12px', color: '#444', textDecoration: 'none', letterSpacing: '0.06em' }}>Privacy</Link>
          <Link href="/app" style={{
            fontSize: '12px', color: '#bbb', textDecoration: 'none', letterSpacing: '0.06em',
            border: '1px solid #2a2a2a', borderRadius: '4px', padding: '6px 14px',
          }}>
            Open →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px 60px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '13px', fontWeight: 400, color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 28px' }}>
          Proof
        </h1>
        <p style={{ fontSize: '28px', fontWeight: 300, color: '#ccc', margin: '0 0 16px', lineHeight: 1.3, maxWidth: '520px' }}>
          Research, broken down.
        </p>
        <p style={{ fontSize: '15px', color: '#555', margin: '0 0 48px', lineHeight: 1.75, maxWidth: '440px' }}>
          Drop in a URL, DOI, or PDF. Proof reads the source and extracts everything worth keeping — right next to where you write.
        </p>
        <Link href="/app" style={{
          display: 'inline-block', padding: '11px 28px',
          background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '4px',
          fontSize: '13px', color: '#bbb', textDecoration: 'none', letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Open Proof →
        </Link>
        <p style={{ marginTop: '14px', fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.06em' }}>
          Free. No account required.
        </p>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1a1a1a', maxWidth: '640px', width: '100%', margin: '0 auto' }} />

      {/* Features */}
      <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', padding: '60px 40px' }}>
        {FEATURES.map(({ label, desc }) => (
          <div key={label} style={{ display: 'flex', gap: '32px', marginBottom: '32px', alignItems: 'flex-start' }}>
            <div style={{ width: '120px', flexShrink: 0, fontSize: '12px', color: '#555', letterSpacing: '0.06em', paddingTop: '2px' }}>
              {label}
            </div>
            <p style={{ flex: 1, fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '14px', color: '#444', margin: 0 }}>
            Free. No account. Open it and start.
          </p>
          <Link href="/app" style={{
            display: 'inline-block', padding: '9px 22px',
            background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '4px',
            fontSize: '12px', color: '#bbb', textDecoration: 'none', letterSpacing: '0.08em',
            textTransform: 'uppercase', flexShrink: 0,
          }}>
            Open →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #111', padding: '20px 40px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
        {[
          { label: 'About',   href: '/about' },
          { label: 'Privacy', href: '/privacy' },
          { label: 'Contact', href: 'mailto:proof_official@protonmail.com' },
        ].map(({ label, href }) => (
          <Link key={label} href={href} style={{ fontSize: '11px', color: '#2a2a2a', textDecoration: 'none', letterSpacing: '0.06em' }}>
            {label}
          </Link>
        ))}
      </div>

    </div>
  )
}
