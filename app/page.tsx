import Nav from '@/components/Nav'

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#080808' }}>
      <Nav />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Hero */}
        <section style={{ maxWidth: '620px', width: '100%', margin: '0 auto', padding: '96px 24px 80px' }}>
          <div style={{ fontSize: '11px', color: '#666', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '32px' }}>
            Proof — Research Workspace
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: 500, color: '#bbb', lineHeight: 1.25, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Read the source.<br />Find the fact. Write from it.
          </h1>

          <p style={{ fontSize: '15px', color: '#777', lineHeight: 1.8, margin: '0 0 40px', maxWidth: '480px' }}>
            Drop a PDF, paste a URL, or add a YouTube video. Proof extracts every statistic,
            finding, claim, and quote — then lets you jump to the exact passage it came from
            and write from the same workspace.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <a href="/app" style={{
              display: 'inline-block',
              background: '#0f0f0f', border: '1px solid #333', borderRadius: '4px',
              padding: '10px 24px', fontSize: '12px', color: '#bbb', textDecoration: 'none',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Open Proof →
            </a>
            <span style={{ fontSize: '12px', color: '#666', letterSpacing: '0.04em' }}>
              First 5 sources free. $3/month after.
            </span>
          </div>
        </section>

        {/* How it works */}
        <section style={{ borderTop: '1px solid #111', maxWidth: '620px', width: '100%', margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ fontSize: '11px', color: '#777', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '40px' }}>
            How it works
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {([
              ['Add a source', 'Drop a PDF, paste a URL, or add a YouTube video. Proof reads the full content and extracts every verifiable fact automatically.'],
              ['Structured extraction', 'Statistics, findings, claims, direct quotes, and key points are pulled out and organized — not summarized, not paraphrased.'],
              ['Jump to the passage', 'Click any fact to jump to exactly where it appears in the source. See it in context, not in isolation.'],
              ['Write from it', 'The synthesis panel sits right next to your sources. Draft notes, a report, or a full document — without switching tabs or losing your place.'],
            ] as const).map(([title, body]) => (
              <div key={title} style={{ display: 'flex', gap: '24px' }}>
                <div style={{ width: '4px', flexShrink: 0, background: '#1a1a1a', borderRadius: '2px', alignSelf: 'stretch' }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#aaa', fontWeight: 500, marginBottom: '6px' }}>{title}</div>
                  <div style={{ fontSize: '13px', color: '#777', lineHeight: 1.7 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Positioning */}
        <section style={{ borderTop: '1px solid #111', maxWidth: '620px', width: '100%', margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ fontSize: '11px', color: '#777', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '40px' }}>
            What this is not
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {([
              ['Not an AI summary', 'Proof does not paraphrase or interpret. It extracts verbatim and ties every fact back to its source.'],
              ['Not a chatbot', 'There is no prompt, no conversation. You read, you verify, you write. Proof just makes that faster.'],
              ['Not a search engine', 'You bring the sources. Proof gives you structured, verifiable access to what is inside them.'],
            ] as const).map(([title, body]) => (
              <div key={title} style={{ fontSize: '13px', color: '#777', lineHeight: 1.75 }}>
                <span style={{ color: '#aaa' }}>{title}. </span>{body}
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section style={{ borderTop: '1px solid #111', maxWidth: '620px', width: '100%', margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '28px', fontWeight: 500, color: '#aaa' }}>$3</span>
            <span style={{ fontSize: '13px', color: '#666' }}>/ month</span>
          </div>
          <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.75, margin: '0 0 28px' }}>
            First 5 sources free — no account needed. After that, $3/month. No tiers, no limits.
          </p>
          <a href="/app" style={{ fontSize: '12px', color: '#777', letterSpacing: '0.08em', textDecoration: 'none', textTransform: 'uppercase' }}>
            Open Proof →
          </a>
        </section>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #111', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '620px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.06em' }}>Proof</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="/about"   style={{ fontSize: '11px', color: '#666', textDecoration: 'none', letterSpacing: '0.06em' }}>About</a>
          <a href="/privacy" style={{ fontSize: '11px', color: '#666', textDecoration: 'none', letterSpacing: '0.06em' }}>Privacy</a>
        </div>
      </footer>
    </div>
  )
}
