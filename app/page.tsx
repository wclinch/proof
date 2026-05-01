import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Nav from '@/components/Nav'

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (session) redirect('/app')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#080808' }}>
      <Nav />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Hero */}
        <section style={{ maxWidth: '620px', width: '100%', margin: '0 auto', padding: '96px 24px 80px' }}>
          <div style={{ fontSize: '11px', color: '#666', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '32px' }}>
            Proof — Research Workspace
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: 500, color: '#bbb', lineHeight: 1.25, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Read. Clip. Write.<br />Never leave.
          </h1>

          <p style={{ fontSize: '15px', color: '#777', lineHeight: 1.8, margin: '0 0 40px', maxWidth: '480px' }}>
            Drop a PDF. Click any paragraph to clip it. Write in the same window.
            Jump back to any passage instantly. No tab switching.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <a href="/app" style={{
              display: 'inline-block',
              background: '#0f0f0f', border: '1px solid #333', borderRadius: '4px',
              padding: '10px 24px', fontSize: '12px', color: '#bbb', textDecoration: 'none',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Open Proof →
            </a>
            <span style={{ fontSize: '12px', color: '#666', letterSpacing: '0.04em' }}>
              Free to use. Sign in to save across devices.
            </span>
          </div>
        </section>

        {/* How it works */}
        <section style={{ borderTop: '1px solid #111', maxWidth: '620px', width: '100%', margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ fontSize: '11px', color: '#777', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '40px' }}>
            How it works
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {([
              ['Drop a PDF', 'Your document loads instantly. No processing, no waiting.'],
              ['Click to clip', 'Click any paragraph to clip it. It appears in the left panel, tied to its exact page. Click again to remove it.'],
              ['Jump back anytime', 'Every clip has a jump button. Click it to go directly back to that passage. Full context, no searching.'],
              ['Write from it', 'The synthesis editor is on the right. Drag any clip into it to start writing. Export as .txt or .md when done.'],
            ] as const).map(([title, body]) => (
              <div key={title} style={{ display: 'flex', gap: '24px' }}>
                <div style={{ width: '4px', flexShrink: 0, background: '#1a1a1a', borderRadius: '2px', alignSelf: 'stretch' }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#aaa', fontWeight: 500, marginBottom: '6px' }}>{title}</div>
                  <div style={{ fontSize: '13px', color: '#777', lineHeight: 1.7 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section style={{ borderTop: '1px solid #111', maxWidth: '620px', width: '100%', margin: '0 auto', padding: '64px 24px' }}>
          <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.75, margin: '0 0 28px' }}>
            Free to use with no account. Sign in to sync your highlights and projects across devices — your PDFs stay on your machine either way.
          </p>
          <a href="/app" style={{ fontSize: '12px', color: '#777', letterSpacing: '0.08em', textDecoration: 'none', textTransform: 'uppercase' }}>
            Open Proof →
          </a>
        </section>

      </main>

      <footer style={{ borderTop: '1px solid #111', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '620px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.06em' }}>Proof</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="/about"   style={{ fontSize: '11px', color: '#666', textDecoration: 'none', letterSpacing: '0.06em' }}>About</a>
          <a href="/privacy" style={{ fontSize: '11px', color: '#666', textDecoration: 'none', letterSpacing: '0.06em' }}>Privacy</a>
        </div>
      </footer>
    </div>
  )
}
