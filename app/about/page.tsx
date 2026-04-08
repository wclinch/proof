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
            Google is broken for research. The first page is SEO farms, AI-generated summaries, and content optimized for clicks — not accuracy. Students spend hours finding sources that don't hold up.
          </p>
        </div>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>What Proof is</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            A vetted source database built from real student essays. Every source in Proof was cited in actual academic work and reviewed by a credentialed educator before going live. No SEO. No ads. No slop.
          </p>
        </div>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>How the database is built</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            Educators approved by Proof collect bibliography pages from student essays and submit them. We verify each source — checking it's live, credible, and correctly categorized — then add it to the database. The more educators contribute, the more useful it becomes.
          </p>
        </div>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>Who controls it</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            Educator access is not open. Every teacher or professor on Proof is manually reviewed and approved. This is how we keep the database clean. If it's in Proof, a real educator put it there.
          </p>
        </div>

        <div style={{ padding: '32px 0', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>Built-in citation</h2>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.75 }}>
            Save any source, then generate a citation in MLA, APA, or Chicago format with one click. No third-party tools, no copy-pasting URLs into a citation generator. The source is already verified — the citation is just the last step.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0', marginTop: '16px', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
          {[
            { number: String(sourcesCount ?? 0), label: 'Sources indexed' },
            { number: '0', label: 'Educators' },
            { number: String(uniqueTopics), label: 'Topics covered' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1,
              padding: '28px',
              borderRight: i < 2 ? '1px solid #141414' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <span style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f0' }}>{stat.number}</span>
              <span style={{ fontSize: '11px', color: '#2a2a2a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '32px' }}>
          <Link href="/signin" style={{
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
