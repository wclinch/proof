import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Privacy() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{ flex: 1, maxWidth: '580px', width: '100%', margin: '0 auto', padding: '56px 20px', display: 'flex', flexDirection: 'column' }}>

        <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '20px', borderBottom: '1px solid #1a1a1a' }}>
          Privacy Policy
        </span>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>What we collect</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            Proof collects anonymous search data — the query entered and the number of results returned. This data is not linked to any user account or personal identifier. No IP addresses are stored.
          </p>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            If you create an account, we store your email address and the sources you choose to save. This information is used solely to provide account functionality and is never sold.
          </p>
        </div>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>Why we collect it</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            Aggregate search data is used to understand what subjects students are researching and where the database has gaps. This informs which topics are added to Proof next.
          </p>
        </div>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>What we do not do</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            We do not sell personal data. We do not serve advertising. We do not track users across other websites. We do not share individual search history with any third party.
          </p>
        </div>

        <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>Contact</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            Questions about this policy can be directed to{' '}
            <a href="mailto:proof_dev@protonmail.com" style={{ color: '#555', textDecoration: 'none' }}>proof_dev@protonmail.com</a>.
          </p>
        </div>

      </main>

      <Footer />
    </div>
  )
}
