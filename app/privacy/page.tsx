import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Privacy() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{ flex: 1, maxWidth: '580px', width: '100%', margin: '0 auto', padding: '56px 20px', display: 'flex', flexDirection: 'column' }}>

        <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '14px', borderBottom: '1px solid #1a1a1a' }}>
          Privacy Policy
        </span>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>Overview</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Proof is a free citation tool. This policy explains what information we collect when you use it, why we collect it, and how it is used. We are committed to handling that information responsibly and transparently.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>Information we collect</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            When you submit a source, we log the URL or DOI you entered, the title of the source retrieved, and the citation format you used. We do not collect your name, email address, or any other information that identifies you as an individual.
          </p>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            We also collect anonymous technical information associated with each request: your approximate geographic location (country and region), the name of your internet service provider or institution, your browser and operating system, your device type, and the referring page that brought you to Proof. Your IP address is used only to derive this information and is never stored.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>How we use this information</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            The information we collect is used in aggregate to understand how Proof is being used — which citation formats are most common, what types of sources are cited, and how users find the tool. This helps us improve the product over time.
          </p>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            We do not use this information to serve advertising, build individual user profiles, or make automated decisions about you.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>Information we do not collect</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Proof does not require an account. We do not collect passwords, payment information, or contact details. We do not use cookies or any cross-site tracking technologies. We do not track your activity across other websites or between sessions on Proof.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>Data sharing</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            We do not sell personal data. Anonymized, aggregate trend data — such as the most frequently cited sources or usage by region — may be shared with or licensed to third parties such as academic institutions or publishers. This data cannot be used to identify any individual user.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>Data retention</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Usage logs are retained indefinitely in aggregate form to support long-term trend analysis. No personally identifiable information is retained because none is collected.
          </p>
        </div>

        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>Contact</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Questions? Reach out at{' '}
            <a href="mailto:proof_official@protonmail.com" style={{ color: '#555', textDecoration: 'none' }}>proof_official@protonmail.com</a>
          </p>
        </div>

      </main>

      <Footer />
    </div>
  )
}
