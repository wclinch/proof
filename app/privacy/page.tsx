import Nav from '@/components/Nav'

export default function Privacy() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{ flex: 1, maxWidth: '580px', width: '100%', margin: '0 auto', padding: '56px 20px', display: 'flex', flexDirection: 'column' }}>

        <span style={{ fontSize: '11px', color: '#777', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          Privacy Policy
        </span>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>The short version</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            Your documents stay on your device. Uploaded content is never stored by Proof. We collect account info, anonymized usage events, and broad topic keywords from uploads. No document content, no file names, no IP addresses.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What we do not collect</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            We do not store document content, file names, or source text. We do not collect IP addresses. We do not sell data. Your projects, sources, and drafts live in your browser and never leave your device.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What we do collect</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#999' }}>Account:</span> email address and subscription status. Required to manage access.
          </p>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#999' }}>Usage analytics:</span> anonymized events — page visits, uploads, feature use (e.g. verifying a fact, exporting). Collected via PostHog. No document content, no IP addresses. Used to understand how the product is being used.
          </p>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#999' }}>Topic keywords:</span> broad subject-area tags extracted from each upload — things like &ldquo;contract law&rdquo; or &ldquo;machine learning&rdquo;. No names, no content, nothing traceable to you or your document.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>AI processing</h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#999' }}>PDFs:</span> document content is sent to <a href="https://www.llamaindex.ai/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#999', textDecoration: 'none' }}>LlamaParse</a> for text extraction, then to <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" style={{ color: '#999', textDecoration: 'none' }}>Groq</a> for analysis. Proof does not retain the content after processing.
          </p>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#999' }}>URLs:</span> page content is fetched via <a href="https://www.firecrawl.dev/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#999', textDecoration: 'none' }}>Firecrawl</a>, then sent to <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" style={{ color: '#999', textDecoration: 'none' }}>Groq</a> for analysis. Proof does not retain the content after processing.
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
