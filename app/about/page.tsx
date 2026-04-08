import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function About() {
  const { count: sourcesCount } = await supabase
    .from('sources')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  const { data: topicsData } = await supabase
    .from('sources')
    .select('topic')
    .eq('status', 'approved')

  const uniqueTopics = new Set(topicsData?.map(r => r.topic) ?? []).size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      <main style={{ flex: 1, maxWidth: '580px', width: '100%', margin: '0 auto', padding: '80px 20px', display: 'flex', flexDirection: 'column' }}>

        <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: '20px', borderBottom: '1px solid #1a1a1a' }}>
          About Proof
        </span>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>The problem</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            Academic research has a sourcing problem. General search engines optimize for engagement, not accuracy — surfacing content that rarely meets scholarly standards. Finding credible, citable sources takes longer than it should.
          </p>
        </div>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>What Proof is</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            A curated reference database for student research. Sources are drawn from real academic work, selected for credibility, and organized by subject. Free to use, no advertising.
          </p>
        </div>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>How the database is built</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            The database is built subject by subject — each topic curated manually and verified before publication. Coverage expands one discipline at a time, prioritizing depth over breadth.
          </p>
        </div>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>Built-in citation</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            Saved sources can be cited directly in MLA, APA, or Chicago format. No external tools required.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0', marginTop: '16px', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
          {[
            { number: String(sourcesCount ?? 0), label: 'Sources indexed' },
            { number: String(uniqueTopics), label: 'Topics covered' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1,
              padding: '28px',
              borderRight: i < 1 ? '1px solid #141414' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <span style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f0' }}>{stat.number}</span>
              <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>What's being built</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              <span style={{ fontSize: '10px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>Now</span>
              <span style={{ fontSize: '14px', color: '#555', lineHeight: 1.6 }}>Economics — monetary policy, trade, labor markets, macroeconomics, behavioral economics.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              <span style={{ fontSize: '10px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>Next</span>
              <span style={{ fontSize: '14px', color: '#333', lineHeight: 1.6 }}>Psychology — cognitive science, developmental psychology, social behavior, mental health research.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              <span style={{ fontSize: '10px', color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>Later</span>
              <span style={{ fontSize: '14px', color: '#2a2a2a', lineHeight: 1.6 }}>Environmental science, US history, public health, criminal justice.</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '32px' }}>
          <Link href="/" style={{
            fontSize: '13px', color: '#555', textDecoration: 'none', letterSpacing: '0.04em',
            border: '1px solid #1e1e1e', padding: '12px 24px', borderRadius: '6px',
          }}>
            Get started
          </Link>
        </div>

      </main>

      <Footer />
    </div>
  )
}
