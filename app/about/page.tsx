import Nav from '@/components/Nav'

const mono: React.CSSProperties = {
  fontFamily: 'inherit',
  background: '#111',
  border: '1px solid #1a1a1a',
  borderRadius: '3px',
  padding: '1px 6px',
  fontSize: '12px',
  color: '#777',
  letterSpacing: '0.04em',
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <span style={mono}>{children}</span>
}

export default function About() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{ flex: 1, maxWidth: '580px', width: '100%', margin: '0 auto', padding: '56px 20px', display: 'flex', flexDirection: 'column' }}>

        <span style={{ fontSize: '11px', color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          About
        </span>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What Proof is</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            Drop a PDF or paste a URL. Every fact, stat, finding, and quote gets extracted and tied to the exact passage it came from. Click any item to see where it actually appears in the source. Write from it in the same window. No tab switching, no lost context.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>How to use it</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>1. Add a source</span> — drop a PDF or paste a URL. Proof reads the full document and extracts everything verifiable.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>2. Read the breakdown</span> — select a source. The center panel shows everything worth knowing from the document in a flat, readable list — then direct quotes and keywords below. Toggle to Source to read the full original text.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>3. Verify a fact</span> — click <span style={{ color: '#999', fontFamily: 'inherit', fontSize: '12px', letterSpacing: '0.06em' }}>src</span> next to any item to jump to exactly where it appears in the source. Full sentence, full paragraph, no new tab.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>4. Write</span> — the Synthesis panel is on the right. Click <span style={{ color: '#999' }}>···</span> in the header to export as <span style={{ color: '#999' }}>.txt</span> or <span style={{ color: '#999' }}>.md</span>, or to discard.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>5. Projects</span> — click Projects in the top bar to manage multiple workspaces. Each project keeps its own sources and draft.
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Shortcuts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { keys: ['⌘↵', 'Ctrl+↵'], desc: 'Open a new draft (when no draft is active and no input is focused)' },
              { keys: ['Tab'], desc: 'Indent 4 spaces inside the draft' },
              { keys: ['Enter'], desc: 'Save a project or source name edit' },
              { keys: ['Esc'], desc: 'Cancel a name edit, or close the projects panel' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, minWidth: '110px' }}>
                  {row.keys.map((k, j) => <Kbd key={j}>{k}</Kbd>)}
                </div>
                <span style={{ fontSize: '13px', color: '#777', lineHeight: 1.5 }}>{row.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Layout</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            Three panels. Left: source list. Center: extracted breakdown or raw source text — toggle between them. Right: synthesis editor — drag the divider to resize. <span style={{ color: '#999' }}>···</span> in the draft header opens export and discard.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Pricing</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            First 5 sources free, no account required. After that, $3/month — one flat price, no limits on sources or projects.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Contact</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            <a href="mailto:proof_official@protonmail.com" style={{ color: '#999', textDecoration: 'none' }}>proof_official@protonmail.com</a>
          </p>
        </div>

        <div style={{ padding: '20px 0', textAlign: 'right' }}>
          <a href="/app" className="nav-link">← Back</a>
        </div>

      </main>
    </div>
  )
}
