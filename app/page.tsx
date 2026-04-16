import Nav from '@/components/Nav'

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#080808' }}>
      <Nav />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Hero */}
        <section style={{ maxWidth: '620px', width: '100%', margin: '0 auto', padding: '96px 24px 80px' }}>
          <div style={{ fontSize: '11px', color: '#333', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '32px' }}>
            Proof — Verification Workbench
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: 500, color: '#bbb', lineHeight: 1.25, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Every claim, pinned to its<br />exact source.
          </h1>

          <p style={{ fontSize: '15px', color: '#444', lineHeight: 1.8, margin: '0 0 40px', maxWidth: '480px' }}>
            Drop a PDF or paste a link. Every statistic, finding, and quote is extracted and
            structured. Click any fact to jump to exactly where it appears in the source —
            no manual searching, no guessing.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <a href="/app" style={{
              display: 'inline-block',
              background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '4px',
              padding: '10px 24px', fontSize: '12px', color: '#bbb', textDecoration: 'none',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Start verifying →
            </a>
            <span style={{ fontSize: '12px', color: '#444', letterSpacing: '0.04em' }}>
              First 5 sources free. $3/month after.
            </span>
          </div>
        </section>

        {/* How it works */}
        <section style={{ borderTop: '1px solid #111', maxWidth: '620px', width: '100%', margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '40px' }}>
            How it works
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {([
              ['Add a source', 'Drop a PDF or paste a URL. Proof reads the full text and extracts every verifiable claim automatically.'],
              ['Structured extraction', 'Statistics, findings, direct quotes, and key points are pulled out and organized — not summarized, not paraphrased.'],
              ['Jump to the source', 'Click any fact to jump to its exact location in the original text. See it in context, not in isolation.'],
              ['Build an audit trail', 'Every fact you verify is hashed and logged. Useful for citation tracking, case prep, or academic review.'],
            ] as const).map(([title, body]) => (
              <div key={title} style={{ display: 'flex', gap: '24px' }}>
                <div style={{ width: '4px', flexShrink: 0, background: '#111', borderRadius: '2px', alignSelf: 'stretch' }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#aaa', fontWeight: 500, marginBottom: '6px' }}>{title}</div>
                  <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.7 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Positioning */}
        <section style={{ borderTop: '1px solid #111', maxWidth: '620px', width: '100%', margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '40px' }}>
            What this is not
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {([
              ['Not an AI summary', 'Proof does not paraphrase or interpret. It extracts verbatim and ties every fact to its source location.'],
              ['Not a writing tool', 'Proof does not write for you. The synthesis panel is a scratchpad — your words, grounded in what you actually read.'],
              ['Not a search engine', 'You bring the sources. Proof gives you structured, precise access to what is inside them.'],
            ] as const).map(([title, body]) => (
              <div key={title} style={{ fontSize: '13px', color: '#444', lineHeight: 1.75 }}>
                <span style={{ color: '#aaa' }}>{title}. </span>{body}
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section style={{ borderTop: '1px solid #111', maxWidth: '620px', width: '100%', margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '28px', fontWeight: 500, color: '#aaa' }}>$3</span>
            <span style={{ fontSize: '13px', color: '#333' }}>/ month</span>
          </div>
          <p style={{ fontSize: '13px', color: '#444', lineHeight: 1.75, margin: '0 0 28px' }}>
            First 5 sources free — no account needed. After that, $3/month. No tiers, no limits.
          </p>
          <a href="/app" style={{ fontSize: '12px', color: '#444', letterSpacing: '0.08em', textDecoration: 'none', textTransform: 'uppercase' }}>
            Start verifying →
          </a>
        </section>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #111', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '620px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '11px', color: '#222', letterSpacing: '0.06em' }}>Proof</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="/about"   style={{ fontSize: '11px', color: '#333', textDecoration: 'none', letterSpacing: '0.06em' }}>About</a>
          <a href="/privacy" style={{ fontSize: '11px', color: '#333', textDecoration: 'none', letterSpacing: '0.06em' }}>Privacy</a>
        </div>
      </footer>
    </div>
  )
}
