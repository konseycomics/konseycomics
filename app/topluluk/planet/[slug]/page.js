import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import { buildMetadata, createSeoDescription } from '../../../lib/seo'
import { getPlanetPostBySlug } from '../../../lib/planetData'
import { notFound } from 'next/navigation'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const slug = resolvedParams?.slug
  const post = await getPlanetPostBySlug(slug)

  if (!post) {
    return buildMetadata({
      title: 'Konsey Planet | Konu Bulunamadı',
      description: 'Aradığın Konsey Planet yazısı bulunamadı.',
      path: `/topluluk/planet/${slug}`,
      keywords: ['Konsey Planet', 'konu bulunamadı'],
    })
  }

  return buildMetadata({
    title: `${post.baslik} | Konsey Planet | KonseyComics`,
    description: createSeoDescription(post.ozet || post.icerik, 'Konsey Planet manşetleri, duyuruları ve editör notları.'),
    path: `/topluluk/planet/${slug}`,
    keywords: ['Konsey Planet', post.tip, ...(post.baslik ? [post.baslik] : [])].filter(Boolean),
  })
}

export default async function KonseyPlanetDetayPage({ params }) {
  const resolvedParams = await params
  const slug = resolvedParams?.slug
  const post = await getPlanetPostBySlug(slug)
  if (!post) notFound()

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', minHeight: '100vh' }}>
        <section className="site-shell" style={{ paddingTop: '34px', paddingBottom: '40px' }}>
          <div style={{ maxWidth: '980px', margin: '0 auto' }}>
            <Link href="/topluluk" style={{ color: '#b7b7b0', textDecoration: 'none', fontSize: '13px', fontWeight: 700, display: 'inline-flex', gap: '8px', alignItems: 'center', marginBottom: '18px' }}>
              ← Topluluğa dön
            </Link>

            <article style={{ padding: '26px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', boxShadow: '0 20px 60px rgba(0,0,0,0.24)' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span style={{ minHeight: '32px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', background: 'rgba(243,210,135,0.12)', border: '1px solid rgba(243,210,135,0.24)', color: '#f3d287', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {post.tip === 'manset' ? 'Manşet' : post.tip === 'duyuru' ? 'Duyuru' : post.tip === 'editor' ? 'Editör Yazısı' : 'Seçki'}
                </span>
                <span style={{ minHeight: '32px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#bcbcb5', fontSize: '11px', fontWeight: 700 }}>
                  {formatDate(post.created_at)}
                </span>
              </div>

              <h1 style={{ color: '#fff', fontSize: 'clamp(34px, 5vw, 64px)', lineHeight: 0.96, margin: '0 0 16px', fontFamily: 'var(--font-display)' }}>
                {post.baslik}
              </h1>

              {post.ozet ? (
                <p style={{ color: '#d2d2cc', fontSize: '18px', lineHeight: 1.8, margin: '0 0 24px' }}>
                  {post.ozet}
                </p>
              ) : null}

              {post.kapak_url ? (
                <div style={{ borderRadius: '22px', overflow: 'hidden', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <img src={post.kapak_url} alt={post.baslik} style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: '460px' }} />
                </div>
              ) : null}

              <div style={{ color: '#e3e3dd', fontSize: '16px', lineHeight: 1.95, whiteSpace: 'pre-wrap' }}>
                {post.icerik}
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
