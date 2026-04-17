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
            Proof keeps you in one place. Drop in a PDF and every fact, stat, finding, and quote gets extracted and tied to the exact passage it came from. Click any item to see where it actually appears in the source — not a summary, the real text. Then write from it in the same window. No tab switching, no lost context, no wondering if something was actually said.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>How to use it</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>1. Add a source</span> — drop a PDF. Proof reads the full document and pulls out every fact, stat, finding, and quote. Nothing is paraphrased or summarized — only what is actually in the text.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>2. Read the breakdown</span> — select a source. The center panel shows extracted items in order: statistics, findings, quotes, conclusions. Toggle to Source view to read the full original text.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>3. Verify a fact</span> — click <span style={{ color: '#999', fontFamily: 'inherit', fontSize: '12px', letterSpacing: '0.06em' }}>src</span> next to any item to jump to exactly where it appears in the source text. See the surrounding sentence, the full paragraph, the actual context — without opening another tab.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>4. Write</span> — the Synthesis panel is on the right. Draft notes, a report, or a full document without leaving the window. Click <span style={{ color: '#999' }}>···</span> in the panel header to export as <span style={{ color: '#999' }}>.txt</span> or <span style={{ color: '#999' }}>.md</span>, or to discard and start over.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>5. Projects</span> — click Projects in the top bar to manage multiple workspaces. Each project keeps its own source list and draft, and everything persists across sessions.
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
                <span style={{ fontSize: '13px', color: '#777', lineHeight: 1.5 }}>{row.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Layout</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            Three panels. The left panel lists your sources — fixed width. The center panel shows the extracted breakdown or the raw source text (toggle via Breakdown / Source). The right panel is the synthesis editor — drag the divider to resize it. When a draft is open, <span style={{ color: '#999' }}>···</span> in its header opens export and discard options.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Pricing</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            The first 5 sources are free — no account required. After that, $3/month with no limits. Cheap enough for a student, useful enough for a firm.
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
