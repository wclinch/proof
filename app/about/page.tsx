import Nav from '@/components/Nav'

const mono: React.CSSProperties = {
  fontFamily: 'inherit',
  background: '#111',
  border: '1px solid #1e1e1e',
  borderRadius: '3px',
  padding: '1px 6px',
  fontSize: '12px',
  color: '#666',
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

        <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          About
        </span>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What Proof is</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Proof is a verification workbench. Drop a PDF or paste a URL — Proof extracts every claim, statistic, finding, and quote and structures them in order of verifiability. Click any fact to jump to its exact location in the source. Every jump is hashed and indexed.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>How to use it</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#555' }}>1. Add sources</span> — drop a PDF into the left panel, click the upload button, or paste a URL into the link field. Each source is analyzed automatically.
            </p>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#555' }}>2. Read the breakdown</span> — select a source from the list. The center panel shows extracted facts in order: statistics, findings, quotes, conclusions, then supporting context below.
            </p>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#555' }}>3. Locate a fact</span> — click <span style={{ color: '#555', fontFamily: 'inherit', fontSize: '12px', letterSpacing: '0.06em' }}>src</span> next to any fact to jump to that exact passage in the source text. This also logs a verified fact record to the index.
            </p>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#555' }}>4. Write</span> — use the Synthesis panel on the right to draft notes or a document. Click <span style={{ color: '#555' }}>···</span> in the panel header to export as <span style={{ color: '#555' }}>.txt</span> or <span style={{ color: '#555' }}>.md</span>, or to discard the draft. Discard requires a confirmation click.
            </p>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#555' }}>5. Projects</span> — click Projects in the top bar to manage multiple workspaces. Each project has its own source list and draft.
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Shortcuts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { keys: ['⌘↵', 'Ctrl+↵'], desc: 'Start a new draft (when synthesis panel is empty and nothing is focused)' },
              { keys: ['Tab'], desc: 'Indent 4 spaces inside the draft textarea' },
              { keys: ['Esc'], desc: 'Close the projects panel' },
              { keys: ['Enter'], desc: 'Confirm a project or source name edit' },
              { keys: ['Esc'], desc: 'Cancel a name edit without saving' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, minWidth: '110px' }}>
                  {row.keys.map((k, j) => <Kbd key={j}>{k}</Kbd>)}
                </div>
                <span style={{ fontSize: '13px', color: '#444', lineHeight: 1.5 }}>{row.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Layout</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            The three panels are resizable — drag the dividers between them. The left panel lists your sources. The center panel shows the extracted breakdown or the raw source text (toggle via Breakdown / Source). The right panel is the synthesis editor — when a draft is open, <span style={{ color: '#555' }}>···</span> in its header opens export and discard options.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Pricing</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            The first 5 sources are free — no account required. After that, $3/month with no limit. Create an account to subscribe.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Contact</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            <a href="mailto:proof_official@protonmail.com" style={{ color: '#555', textDecoration: 'none' }}>proof_official@protonmail.com</a>
          </p>
        </div>

        <div style={{ padding: '20px 0', textAlign: 'right' }}>
          <a href="/app" className="nav-link">← Back</a>
        </div>

      </main>
    </div>
  )
}
