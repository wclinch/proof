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
            Proof collects anonymous search data — the query entered, the number of results returned, and whether a result was clicked. This data is never linked to an individual user or personal identifier. No IP addresses are stored.
          </p>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            For signed-in users, we also record the institutional domain associated with their account (for example, <span style={{ color: '#666' }}>university.edu</span> or <span style={{ color: '#666' }}>agency.gov</span>). This is extracted from their email address and stored as a domain suffix only — never as a full email address — and is never linked back to an individual.
          </p>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            If you create an account, we store your email address and the sources you choose to save. Your email is used solely for account authentication and is never sold or shared.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>Why we collect it</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Aggregate search data helps us understand what subjects are being researched and where the database has gaps. Institutional domain data lets us understand which academic communities are using Proof and where coverage is most needed. This informs which topics are prioritized next.
          </p>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            We may share anonymized, aggregate trend reports derived from this data — for example, the most-searched topics across all users, or subject areas with high search volume and few results. These reports contain no personal information and cannot be used to identify any individual.
          </p>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>What we do not do</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            We do not sell personal data. We do not sell or share individual email addresses. We do not serve advertising. We do not track users across other websites. We do not share individual search history with any third party.
          </p>
        </div>

        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>Contact</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75, margin: 0 }}>
            Questions about this policy can be directed to{' '}
            <a href="mailto:proof_dev@protonmail.com" style={{ color: '#555', textDecoration: 'none' }}>proof_dev@protonmail.com</a>.
          </p>
        </div>

      </main>

      <Footer />
    </div>
  )
}
