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
            Proof is a research tool that turns sources into structured knowledge. Paste a URL, DOI, or upload a PDF — Proof extracts the title, authors, methodology, findings, key statistics, and notable quotes, so you can spend less time reading and more time thinking.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>How it works</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            When you submit a source, Proof fetches the content directly. For academic papers, it queries CrossRef to retrieve structured metadata from the DOI. For web pages and PDFs, it reads the full text. That content is then analyzed by an AI model trained to extract research-grade structure — not summaries or paraphrases, but the actual claims, numbers, and conclusions from the source.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            You can queue multiple sources and work through them in sequence. Each analysis appears in the center panel. Your draft lives in the right panel. Everything in one workspace.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Projects</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Proof lets you organize research into named projects and switch between them instantly. Your sources, analyses, and draft are stored locally in your browser — nothing is sent to a server, nothing is tied to an account.
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
