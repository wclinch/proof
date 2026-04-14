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
            Proof is a research workspace that extracts structured knowledge from sources so you can write faster and think more clearly. Paste a URL, a DOI, or upload a PDF — Proof reads the source, runs it through an AI model, and returns a structured breakdown: authors, methodology, key findings, statistics, direct quotes, limitations, and more. Everything lands in a three-panel workspace where you can read the analysis, jump back into the source text, and write your draft — all without switching tabs.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>The workspace</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            The layout has three panels side by side:
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Left — Sources.</span> This is where you add and manage your sources. Paste URLs or DOIs into the text area (one per line, or comma-separated) and press Analyze, or use <span style={{ color: '#555' }}>⌘↵</span> to submit. You can also drag and drop PDF or TXT files directly onto the input area, or click the upload button (↑) to select files from your device. Each source appears in a list below the input with a status dot: grey means queued, dim means analyzing, green means done, red means an error occurred.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Middle — Analysis / Source.</span> When you select a source from the list, its AI-extracted analysis appears here. You can toggle between Analysis view and Source view using the buttons in the top right of this panel. Analysis view shows the structured breakdown. Source view shows the full raw text of the source, with any highlighted passage scrolled into view and marked in green.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Right — Draft.</span> Your writing space. Click New Draft to begin, enter a title, then start writing. The title is required before the textarea unlocks — this is intentional. You can export your draft as <span style={{ color: '#555' }}>.txt</span> or <span style={{ color: '#555' }}>.md</span> using the Export button in the bottom right of the draft panel.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What the analysis extracts</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Each analyzed source produces the following fields where available:
          </p>
          {[
            ['Title, Authors, Year, Journal, DOI, Type', 'Bibliographic metadata.'],
            ['Abstract', 'The full abstract, verbatim.'],
            ['Sample', 'Sample size and population description as stated in the text.'],
            ['Methodology', 'Research design, instruments, and analytic approach.'],
            ['Statistics', 'Numerical results only — means, percentages, p-values, effect sizes, correlations.'],
            ['Findings', 'Key results from the results section, verbatim or near-verbatim.'],
            ['Conclusions', 'What the authors conclude or recommend.'],
            ['Direct Quotes', 'Exact quotable passages worth citing.'],
            ['Limitations', 'Limitations the authors acknowledge.'],
            ['Concepts & Frameworks', 'Named theories, models, and constructs referenced.'],
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
            <span style={{ color: '#555' }}>◎ Find in source</span> — appears next to each analysis item. Clicking it switches to Source view and scrolls to and highlights the exact passage in the original text that corresponds to that item.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>⌘ Copy</span> — appears next to each analysis item. Clicking it copies that item{"'"}s text to your clipboard. The icon turns green for a moment to confirm.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Right-click a source</span> — opens a context menu with options to Rename, Re-analyze (URL and DOI sources only, limited to once every 30 seconds), or Remove. Removing requires a second click to confirm.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>Shift-click sources</span> — selects a range of sources. Right-clicking a multi-selection lets you remove all selected sources at once.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Projects</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Proof organizes your work into projects. Each project has its own source list, analysis history, and draft. Click Projects in the top bar to see all projects and switch between them, or click New to create one. Right-clicking a project in the list lets you rename or remove it. You must always have at least one project — the last one cannot be deleted. Click the project name in the top bar to rename it inline.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            All projects, sources, and drafts are stored in your browser using localStorage. Nothing is sent to a server. Clearing your browser data will erase your projects.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Supported source types</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>DOIs</span> — paste a DOI directly (e.g. <span style={{ color: '#444' }}>10.1037/a0012345</span>) or a doi.org URL. Proof queries CrossRef for structured metadata and uses it to build the analysis. Best coverage for peer-reviewed journal articles.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>URLs</span> — paste any web URL. Proof fetches the page content and extracts readable text. Some sites block external access — if that happens, try using the DOI instead.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#555' }}>PDFs</span> — upload via the ↑ button or drag and drop onto the input area. Proof extracts and parses the full text. Also supports plain .txt files.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>No account required</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Proof is free. There is no sign-up, no paywall, and no advertising. Open the page and start researching.
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
