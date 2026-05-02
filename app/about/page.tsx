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
            A research workspace that keeps you inside your source documents while you write. Drop a PDF, click any paragraph to clip it, stage and trim the clip, drag exactly what you need into Synthesis. No tab switching.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>How to use it</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>1. Add a source</span> — drop a PDF or click to upload. It loads immediately.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>2. Click to clip</span> — click any paragraph in the PDF to clip it. It appears in the Clips panel on the left, tied to its page. Click the same paragraph again to remove it.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>3. Stage and trim</span> — click a clip to expand it. Edit the text down to just what you need, or leave it as-is.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>4. Send to Synthesis</span> — select a sentence in the clip, then hover and click <span style={{ color: '#999' }}>drag →</span> to send just that selection. Or drag the whole clip without selecting anything.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>5. Jump back</span> — hover a clip and click <span style={{ color: '#999' }}>jump</span> to scroll the PDF back to that passage.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>6. Remove a clip</span> — hover a clip and click <span style={{ color: '#999' }}>···</span> to remove it. Or click the same paragraph again in the PDF.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>7. Write and export</span> — the Synthesis panel is on the right. Write freely or drop clips into it. Click <span style={{ color: '#999' }}>···</span> to export as <span style={{ color: '#999' }}>.txt</span> or <span style={{ color: '#999' }}>.md</span>.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>8. Projects</span> — click Projects in the top bar to manage multiple workspaces. Sign in to sync clips and projects across devices.
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Shortcuts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { keys: ['Click'], desc: 'Click any paragraph in the PDF to clip it. Click again to remove.' },
              { keys: ['Cmd+F', 'Ctrl+F'], desc: 'Open the in-PDF find bar' },
              { keys: ['Enter'], desc: 'Next find result (when find bar is open)' },
              { keys: ['Esc'], desc: 'Close find bar' },
              { keys: ['···'], desc: 'Hover any clip or source to reveal the options menu' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, minWidth: '130px' }}>
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
            Three panels. Left: source list. Center: Clips staging area (left half) + PDF viewer with find bar and page jump (right half). Right: Synthesis editor. Drag the divider between center and right to resize. The Clips panel is also resizable.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Compatibility</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            Works best with standard PDFs — black text on white background, generated from a word processor or typesetting tool. Clipping is not supported on scanned documents, image-only PDFs, or documents with non-standard text layers.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Saving your work</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            Free to use with no account. PDFs are always stored locally in your browser. Sign in to sync your clips and projects across devices — PDF files still stay on your machine and need to be re-opened on each device.
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
