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
  letterSpacing: '0.02em',
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <span style={mono}>{children}</span>
}

export default function About() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{ flex: 1, maxWidth: '580px', width: '100%', margin: '0 auto', padding: '56px 20px', display: 'flex', flexDirection: 'column' }}>

        <span style={{ fontSize: '13px', color: '#888', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          About
        </span>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What Site is</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            A focused workspace for research and writing. Load PDFs, images, and web references — all in a split view. Write from them on the right. No switching tabs, no copy-pasting, no losing your place.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>How to use it</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>1. Organize with workspaces</span> — click the workspace name at the top of the left panel to switch between or create workspaces. Each workspace has its own source list, scratchpad, and draft.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>2. Add references</span> — drop PDFs or images into the left panel, or paste a URL. Everything sits in the source list until you open it.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>3. Open in split view</span> — drag an image or URL into the top half of the center panel, drag a PDF or website into the bottom half. Hit the expand icon on either header to fullscreen it. Hit X to close it from the viewer.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>4. Write</span> — type in the draft panel on the right. The draft is tied to the open PDF and saves automatically.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>5. Export</span> — use the <span style={{ color: '#999' }}>···</span> menu to save as <span style={{ color: '#999' }}>.txt</span> or <span style={{ color: '#999' }}>.md</span>.
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Interactions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { keys: ['Workspace name'],        desc: 'Open workspace switcher' },
              { keys: ['Right-click workspace'], desc: 'Rename or delete workspace' },
              { keys: ['Drag image / URL'],        desc: 'Drop into the top viewer pane' },
              { keys: ['Drag PDF / website'],    desc: 'Drop into the bottom viewer pane' },
              { keys: ['Expand (↗)'],           desc: 'Fullscreen that pane in the center column' },
              { keys: ['X'],                     desc: 'Close source from viewer' },
              { keys: ['Drop file'],             desc: 'Add to the source list (PDF or image)' },
              { keys: ['Add URL'],               desc: 'Embed a web page as a reference' },
              { keys: ['Scratchpad'],            desc: 'Freeform notes at the bottom of the left panel — saved per workspace' },
              { keys: ['Right-click source'],    desc: 'Rename or remove' },
              { keys: ['··· (draft)'],           desc: 'Export or clear the draft' },
              { keys: ['Esc'],                   desc: 'Close menus' },
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
            Three columns. Left: workspace switcher, source list, and scratchpad. Center: split viewer (image/URL top, PDF/website bottom). Right: draft editor.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Reference types</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>PDF</span> — renders with selectable text. Scanned or image-only PDFs display but text won't be selectable.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>Image</span> — PNG, JPG, WEBP, GIF. Loads in the top viewer pane.
            </p>
            <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#999' }}>URL</span> — embeds the page in the bottom viewer pane. Sites that block embedding show an open-in-browser link instead.
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Saving your work</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            No account needed. Files and drafts are stored locally in your browser. Sign in to sync your workspaces, scratchpad notes, and draft text across devices — files stay on your machine and need to be re-added on each device.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Contact</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            <a href="mailto:proof_official@protonmail.com" className="inline-link">proof_official@protonmail.com</a>
          </p>
        </div>

        <div style={{ padding: '20px 0', textAlign: 'right' }}>
          <BackButton />
        </div>

      </main>
    </div>
  )
}
