import Nav from '@/components/Nav'
import BackButton from '@/components/BackButton'

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
            A reading and writing workspace. Drop a PDF, read it as clean structured text, clip the sentences you need, and write your draft — all in one place. No switching tabs, no copy-pasting, no losing your place.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>How to use it</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>1. Add a document</span> — drop a PDF into the left panel. It's extracted and ready to read in seconds.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>2. Read</span> — your document opens as clean readable text in the center. Scroll through at your own pace.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>3. Clip sentences</span> — click any sentence to clip it along with its surrounding context. It appears in the Clips panel on the left. Click a clipped sentence to remove it, or click beside a clip to expand it.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>4. Build your draft</span> — click <span style={{ color: '#999' }}>Insert</span> on any clip to add it to your draft at the cursor. Write freely around it.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>5. Save your draft</span> — when you're done, click <span style={{ color: '#999' }}>···</span> in the Draft panel to save as <span style={{ color: '#999' }}>.txt</span> or <span style={{ color: '#999' }}>.md</span>.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>6. Workspaces</span> — click your project name at the top to manage multiple workspaces. Sign in to sync across devices.
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Interactions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { keys: ['Click sentence'],       desc: 'Clip it with its surrounding context' },
              { keys: ['Click clipped'],        desc: 'Remove only that sentence from the clip' },
              { keys: ['Click beside clip'],    desc: 'Expand the clip by one sentence' },
              { keys: ['Insert (on clip)'],     desc: 'Add the clip to your draft at the cursor' },
              { keys: ['···  (on clip)'],       desc: 'Remove the clip' },
              { keys: ['Tab (in draft)'],       desc: 'Indent by four spaces' },
              { keys: ['Cmd+Enter'],            desc: 'Start a new draft when the draft panel is empty' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, minWidth: '160px' }}>
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
            Three columns. Left: document list. Center: clips panel (left half) + document reader (right half) — the divider between them is draggable. Right: draft editor. The divider between center and right is also draggable.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Document support</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            Works with standard text-based PDFs. Text is extracted once when you add the file. Scanned documents and image-only PDFs are not supported.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Saving your work</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            Free to use with no account. Your documents are stored locally in your browser. Sign in to sync your clips and workspaces across devices — documents stay on your machine and need to be re-added on each device.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Contact</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            <a href="mailto:proof_official@protonmail.com" style={{ color: '#999', textDecoration: 'none' }}>proof_official@protonmail.com</a>
          </p>
        </div>

        <div style={{ padding: '20px 0', textAlign: 'right' }}>
          <BackButton />
        </div>

      </main>
    </div>
  )
}
