import Nav from '@/components/Nav'

export default function About() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{ flex: 1, maxWidth: '580px', width: '100%', margin: '0 auto', padding: '56px 20px', display: 'flex', flexDirection: 'column' }}>

        <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          About
        </span>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What is Proof?</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Proof is a research workspace. Drop in a URL, a DOI, or a PDF — Proof reads the source, runs it through an AI model, and breaks it down into structured information: who wrote it, what they found, what the numbers say, what they concluded, and what&apos;s worth quoting. Everything sits in a three-panel layout where you can read the breakdown, jump back into the source text, and write — all without switching tabs.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>The layout</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Three panels, side by side. Drag the dividers between them to resize — collapse any panel down to almost nothing if you need the space.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Left — Sources.</span> Paste URLs or DOIs into the input — one per line or comma-separated — and hit Analyze, or use <span style={{ color: '#555' }}>⌘↵</span>. You can also drag and drop PDF or TXT files directly onto the input, or click the upload button (↑) to pick files from your device. Each source appears in the list below with a status dot: grey is queued, pulsing is running, green is done, red is an error. A filter input above the list lets you search by title, label, or URL.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Middle — Breakdown.</span> Select a source and its extracted information appears here. Toggle between Breakdown and Source using the buttons at the top right. Breakdown shows the structured output. Source shows the full raw text, with any highlighted passage scrolled into view and marked in green. If the source text was truncated (PDFs over ~20k characters), a note appears at the bottom of Source view. Export the full breakdown as <span style={{ color: '#555' }}>.txt</span> or <span style={{ color: '#555' }}>.md</span> using the buttons in the top right.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Right — Synthesis.</span> Your writing space. Click New to start, give it a title, then write. The title unlocks the text area — this is intentional. Export as <span style={{ color: '#555' }}>.txt</span> or <span style={{ color: '#555' }}>.md</span> using the Export button at the bottom right.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            At the bottom of the Synthesis panel is the <span style={{ color: '#555' }}>source ledger</span>. Drag any analyzed source from the left panel and drop it here to add it to your reference list. The ledger splits into two columns: a formatted entry on the left and a short parenthetical on the right. Both are copyable. Right-click a ledger entry to remove it. The source stays in your source list — the ledger just tracks what you&apos;ve cited.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What gets extracted</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Each source produces the following where available:
          </p>
          {[
            ['Title, Authors, Year, Journal, DOI, Type', 'Publication details.'],
            ['Abstract', 'The full abstract, verbatim.'],
            ['Sample', 'Who was studied and how many, as stated.'],
            ['Methodology', 'Research design and how it was done.'],
            ['Statistics', 'Numbers only — means, percentages, p-values, effect sizes, correlations.'],
            ['Findings', 'Key results, verbatim or near-verbatim.'],
            ['Conclusions', 'What the authors concluded or recommended.'],
            ['Direct Quotes', 'Exact passages worth citing.'],
            ['Limitations', 'What the authors said their work couldn\'t do.'],
            ['Concepts & Frameworks', 'Named theories, models, and constructs.'],
            ['Keywords', 'Key terms from the source.'],
          ].map(([label, desc]) => (
            <p key={label} style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: '#555' }}>{label} — </span>{desc}
            </p>
          ))}
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Buttons and actions</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>◎ Find in source</span> — appears next to each extracted item. Switches to Source view and scrolls to the exact passage in the original text.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>⌘ Copy</span> — copies that item to your clipboard. Turns green for a moment to confirm.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Right-click a source</span> — opens a menu with Rename, Re-analyze (URL and DOI sources only, limited to once every 30 seconds), or Remove. Removing requires a second click to confirm.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Shift-click sources</span> — selects a range. Right-clicking a multi-selection lets you remove all of them at once.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Drag a source</span> — drag any analyzed source from the left panel and drop it onto the ledger at the bottom of the Synthesis panel to add it to your reference list.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Reference formats</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            The source ledger supports three formats — switch between them using the toggle in the ledger header. The format applies to both the full entry and the short parenthetical.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>MLA</span> — Works Cited format. In-text: (Author).
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>APA</span> — References format. In-text: (Author, Year).
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Chicago</span> — Bibliography format. In-text: (Author Year).
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Projects</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Proof organizes work into projects. Each project has its own source list, breakdown history, synthesis, and reference ledger. Click Projects in the top bar to see all projects and switch between them, or click New to create one. Right-clicking a project lets you rename or remove it. You always need at least one — the last one can&apos;t be deleted. Click the project name in the top bar to rename it inline.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Everything is stored in your browser using localStorage. Nothing is sent to a server. Clearing your browser data will erase your projects. Use <span style={{ color: '#555' }}>Export</span> in the Projects modal to download all your projects as a JSON backup, and <span style={{ color: '#555' }}>Import</span> to load them back — on any device or browser. Importing merges incoming projects with your existing ones.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What you can drop in</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>DOIs</span> — paste a DOI directly (e.g. <span style={{ color: '#444' }}>10.1037/a0012345</span>) or a doi.org URL. Proof queries CrossRef for structured data and uses it to build the breakdown. Best coverage for peer-reviewed work.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>URLs</span> — paste any web URL. Proof fetches the page and extracts readable text. Some sites block external access — if that happens, try the DOI instead.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>PDFs and TXTs</span> — upload via the ↑ button or drag and drop onto the input area.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>No account required</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Proof is free. No sign-up, no paywall, no ads. Open it and start.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Contact</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Questions or feedback?{' '}
            <a href="mailto:proof_official@protonmail.com" style={{ color: '#555', textDecoration: 'none' }}>proof_official@protonmail.com</a>
          </p>
        </div>

        <div style={{ padding: '20px 0', textAlign: 'right' }}>
          <a href="/" className="nav-link">Go to home →</a>
        </div>

      </main>
    </div>
  )
}
