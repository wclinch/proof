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
            Proof is a free AI-powered research assistant. Paste URLs or DOIs and it extracts structured insights from your sources — key claims, statistics, quotes, and keywords — so you can write faster and think more clearly.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>How it works</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            When you submit a link, Proof fetches the source content. For academic papers, it queries CrossRef using the DOI to retrieve structured metadata. For web pages, it reads the page directly. The content is then sent to an AI model, which extracts a structured summary: the title, authors, publication year, main claims, key statistics, notable quotes, and keywords.
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            You can queue multiple sources and analyze them in sequence. Each source's analysis appears in the middle panel, and you write your draft in the right panel — all in one workspace.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>Projects</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Proof lets you organize your work into named projects and switch between them. Your sources, analyses, and draft are stored locally in your browser — nothing is sent to a server or tied to an account.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>No account required</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.75, margin: 0 }}>
            Proof is free to use without signing up. There are no ads, no paywalls, and no upsells. Open the page, paste your sources, get your insights.
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
