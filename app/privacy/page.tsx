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
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>What we collect</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Each citation request logs the DOI or URL submitted and the title of the source retrieved. No account, email address, or personal identifier is required or stored.
          </p>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            We attempt to identify the institutional domain of the network you're on (for example, <span style={{ color: '#666' }}>university.edu</span> or <span style={{ color: '#666' }}>agency.gov</span>) using a reverse DNS lookup on your IP address. Your IP address itself is not stored — only the derived domain, if one is found. If you're on a home or mobile network, nothing is recorded.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>Why we collect it</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Aggregate data helps us understand which sources and subject areas are being cited most, and which institutional communities use Proof. This informs how the tool is developed. We may publish anonymized trend reports — for example, the most-cited journals across all users. These contain no personal information.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>What we do not do</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            We do not store IP addresses. We do not require sign-up. We do not serve advertising. We do not sell data. We do not track users across other websites.
          </p>
        </div>

        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>Contact</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Questions about this policy:{' '}
            <a href="mailto:proof_official@protonmail.com" style={{ color: '#555', textDecoration: 'none' }}>proof_official@protonmail.com</a>
          </p>
        </div>

      </main>

      <Footer />
    </div>
  )
}
