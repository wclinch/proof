import Nav from '@/components/Nav'

export default function Privacy() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{ flex: 1, maxWidth: '580px', width: '100%', margin: '0 auto', padding: '56px 20px', display: 'flex', flexDirection: 'column' }}>

        <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          Privacy Policy
        </span>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>The short version</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Your documents stay on your device. The content you upload or link to is never stored by Proof. We collect no personal information beyond what is required to operate an account. The only aggregate data we log is a set of broad, anonymized subject keywords — never document content, never source names, never anything that could identify you or what you are working on.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What we do not collect</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            We do not store the content of any document you analyze. We do not store file names, source titles, URLs, or any text from the documents you work with. We do not collect IP addresses, browser fingerprints, or behavioral data. We do not use cookies for tracking. Your projects, source lists, and drafts are stored locally in your browser and never leave your device.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>What we do collect</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#777' }}>Account holders:</span> email address and subscription status. Required to manage access. Nothing else is associated with your account.
          </p>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            <span style={{ color: '#777' }}>Aggregate topic trends:</span> when a source is analyzed, we log a small set of broad, anonymized subject-area keywords — things like &ldquo;contract law&rdquo; or &ldquo;cardiovascular disease&rdquo;. These are discipline-level categories only. No proper nouns, no names, no case identifiers, no document content. This data is fully anonymous and cannot be traced back to you, your session, or your documents.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>AI processing</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Document content is sent to Groq&apos;s inference infrastructure for AI extraction. This is transient — Proof does not retain the content after processing. Please review <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" style={{ color: '#555', textDecoration: 'none' }}>Groq&apos;s privacy policy</a> for details on how content submitted to their API is handled on their end.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', margin: 0 }}>How topic data is used</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            The anonymized subject keyword data may be used internally to understand usage patterns or licensed in aggregate to research institutions. Individual records cannot be linked to any user, session, document, or organization. This data has no commercial value without aggregation and is never sold at the individual level.
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
