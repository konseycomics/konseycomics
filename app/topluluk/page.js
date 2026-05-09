import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { buildMetadata, createSeoDescription, createSupabaseServerClient } from '../lib/seo'
import { getLeaderboards } from '../lib/leaderboardData'
import { unstable_noStore as noStore } from 'next/cache'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function getCommentPreview(comment) {
  if (!comment?.icerik) return 'Yorum içeriği bulunamadı.'
  if (comment.spoiler) return 'Bu yorum spoiler içeriyor. Ayrıntılar için seri sayfasına geç.'
  const text = String(comment.icerik).trim()
  return text.length > 140 ? `${text.slice(0, 137).trim()}...` : text
}

function buildSeriesMap(comments = []) {
  const map = new Map()

  for (const comment of comments) {
    const series = Array.isArray(comment.seriler) ? comment.seriler[0] : comment.seriler
    if (!series?.id) continue

    if (!map.has(series.id)) {
      map.set(series.id, {
        id: series.id,
        baslik: series.baslik,
        slug: series.slug,
        kapak_url: series.kapak_url,
        yorumSayisi: 0,
        sonYorumAt: comment.created_at,
        sonYorum: comment,
      })
    }

    const current = map.get(series.id)
    current.yorumSayisi += 1

    if (new Date(comment.created_at) > new Date(current.sonYorumAt)) {
      current.sonYorumAt = comment.created_at
      current.sonYorum = comment
    }
  }

  return [...map.values()]
}

async function getCommunityData() {
  noStore()
  const supabase = createSupabaseServerClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const [{ data: latestComments }, { data: weeklyComments }, leaderboards] = await Promise.all([
    supabase
      .from('yorumlar')
      .select('id, icerik, spoiler, created_at, kullanici_id, seri_id, seriler(id, baslik, slug, kapak_url)')
      .eq('silindi', false)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('yorumlar')
      .select('id, icerik, spoiler, created_at, kullanici_id, seri_id, seriler(id, baslik, slug, kapak_url)')
      .eq('silindi', false)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    getLeaderboards(),
  ])

  const yorumlar = latestComments || []
  const haftalikYorumlar = weeklyComments || []
  const profilIds = [...new Set([...yorumlar, ...haftalikYorumlar].map((yorum) => yorum.kullanici_id).filter(Boolean))]

  const { data: profiles } = profilIds.length > 0
    ? await supabase
        .from('public_profiller')
        .select('id, kullanici_adi, avatar_url')
        .in('id', profilIds)
    : { data: [] }

  const profileMap = new Map((profiles || []).map((profil) => [profil.id, profil]))
  const yorumlarWithProfiles = yorumlar.map((yorum) => ({
    ...yorum,
    profil: profileMap.get(yorum.kullanici_id) || null,
  }))

  const populerKonular = buildSeriesMap(haftalikYorumlar)
    .sort((a, b) => b.yorumSayisi - a.yorumSayisi || new Date(b.sonYorumAt) - new Date(a.sonYorumAt))
  const haftaninKonusu = populerKonular[0] || null

  return {
    haftaninKonusu,
    populerKonular: populerKonular.slice(0, 4),
    sonYorumlar: yorumlarWithProfiles,
    aktifOkuyucular: leaderboards.haftalik || [],
  }
}

export async function generateMetadata() {
  return buildMetadata({
    title: 'Topluluk | KonseyComics',
    description: createSeoDescription(
      '',
      'KonseyComics topluluğunda en çok konuşulan serileri, son yorumları ve haftanın aktif okuyucularını keşfet.'
    ),
    path: '/topluluk',
    keywords: ['KonseyComics topluluk', 'çizgi roman yorumları', 'seri tartışmaları', 'okur topluluğu'],
  })
}

export default async function ToplulukPage() {
  const { haftaninKonusu, populerKonular, sonYorumlar, aktifOkuyucular } = await getCommunityData()

  return (
    <>
      <Navbar />
      <main style={{ background: '#060606', minHeight: '100vh' }}>
        <section className="site-shell" style={{ paddingTop: '42px', paddingBottom: '28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '10px' }}>
              Topluluk
            </div>
            <h1 style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 7vw, 88px)', lineHeight: 0.92, textTransform: 'uppercase' }}>
              Konsey Topluluk Merkezi
            </h1>
            <p style={{ maxWidth: '72ch', margin: '14px auto 0', color: '#b8b8b2', fontSize: '15px', lineHeight: 1.8 }}>
              Tam forum kurmadan önce topluluğun gerçekten nerede canlandığını tek yerde toplayalım. En çok konuşulan seri, son yorumlar ve haftanın aktif okuyucuları burada.
            </p>
          </div>

          <div className="community-hero-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', gap: '18px', marginBottom: '22px' }}>
            <section style={{ position: 'relative', overflow: 'hidden', padding: '24px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', boxShadow: '0 18px 40px rgba(0,0,0,0.18)' }}>
              {haftaninKonusu?.kapak_url ? (
                <img src={haftaninKonusu.kapak_url} alt={haftaninKonusu.baslik} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }} />
              ) : null}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.88) 100%)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ color: '#f5b942', fontSize: '11px', fontWeight: 800, letterSpacing: '1.3px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Haftanın Konusu
                </div>
                <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5vw, 54px)', lineHeight: 0.92, marginBottom: '10px' }}>
                  {haftaninKonusu?.baslik || 'Topluluk yeni ısınıyor'}
                </div>
                <p style={{ margin: 0, color: '#c8c8c2', fontSize: '15px', lineHeight: 1.8, maxWidth: '52ch' }}>
                  {haftaninKonusu
                    ? `Bu hafta ${haftaninKonusu.yorumSayisi} yorumla en çok konuşulan seri oldu. Son yorum ${formatDate(haftaninKonusu.sonYorumAt)} tarihinde geldi.`
                    : 'Henüz haftanın konusu netleşmedi. İlk kıvılcımı yorumlar yakacak.'}
                </p>
                {haftaninKonusu ? (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
                    <Link href={`/seri/${haftaninKonusu.slug}`} style={{ minHeight: '46px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px', borderRadius: '14px', background: '#fff', color: '#111', textDecoration: 'none', fontSize: '12px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                      Seri Tartışmasına Git
                    </Link>
                    <span style={{ minHeight: '38px', display: 'inline-flex', alignItems: 'center', padding: '0 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '11px', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase' }}>
                      {haftaninKonusu.yorumSayisi} yorum
                    </span>
                  </div>
                ) : null}
              </div>
            </section>

            <section style={{ padding: '22px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', boxShadow: '0 18px 40px rgba(0,0,0,0.18)' }}>
              <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
                Bu Hafta En Aktif Okuyucular
              </div>
              <div style={{ color: '#9d9d97', fontSize: '12px', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '14px' }}>
                Haftalık ritim
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {aktifOkuyucular.slice(0, 5).map((uye, index) => (
                  <Link key={uye.id} href={`/profil/${uye.kullanici_adi}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '36px 48px minmax(0, 1fr) auto', gap: '12px', alignItems: 'center', padding: '12px 14px', borderRadius: '18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ color: '#8f8f8a', fontSize: '13px', fontWeight: 900 }}>#{index + 1}</div>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '2px solid rgba(255,255,255,0.1)' }}>
                        {uye.avatar_url
                          ? <img src={uye.avatar_url} alt={uye.kullanici_adi} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>{uye.kullanici_adi?.[0]?.toUpperCase()}</div>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#fff', fontSize: '15px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uye.kullanici_adi}</div>
                        {uye.unvan ? <div style={{ color: '#9f9f99', fontSize: '11px', marginTop: '4px' }}>{uye.unvan}</div> : null}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '30px', lineHeight: 0.9 }}>{uye.okumaSayisi}</div>
                        <div style={{ color: '#bcbcb6', fontSize: '10px', letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: '4px' }}>okuma</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section style={{ marginBottom: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 46px)', lineHeight: 0.92 }}>En Çok Konuşulan Seriler</div>
                <div style={{ color: '#9f9f99', fontSize: '13px', marginTop: '6px' }}>Son 7 gün içinde yorumu en çok büyüyen başlıklar.</div>
              </div>
            </div>
            <div className="community-series-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
              {populerKonular.map((seri, index) => (
                <Link key={seri.id} href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
                  <article style={{ padding: '14px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', boxShadow: '0 18px 40px rgba(0,0,0,0.16)' }}>
                    <div style={{ position: 'relative', aspectRatio: '2 / 3', borderRadius: '16px', overflow: 'hidden', background: '#111', marginBottom: '12px' }}>
                      {seri.kapak_url
                        ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, textAlign: 'center', padding: '12px' }}>{seri.baslik}</div>}
                      <div style={{ position: 'absolute', top: '10px', left: '10px', minHeight: '28px', padding: '0 10px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.78)', color: '#fff', fontSize: '10px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                        #{index + 1}
                      </div>
                    </div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 800, lineHeight: 1.3, marginBottom: '8px' }}>{seri.baslik}</div>
                    <div style={{ color: '#b7b7b2', fontSize: '12px', lineHeight: 1.7, minHeight: '40px' }}>
                      {getCommentPreview(seri.sonYorum)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '12px', color: '#8f8f89', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      <span>{seri.yorumSayisi} yorum</span>
                      <span>{formatDate(seri.sonYorumAt)}</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 46px)', lineHeight: 0.92 }}>Son Yorumlar</div>
              <div style={{ color: '#9f9f99', fontSize: '13px', marginTop: '6px' }}>Topluluğun son bıraktığı izler.</div>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {sonYorumlar.map((yorum) => {
                const seri = Array.isArray(yorum.seriler) ? yorum.seriler[0] : yorum.seriler
                return (
                  <Link key={yorum.id} href={seri?.slug ? `/seri/${seri.slug}` : '/seriler'} style={{ textDecoration: 'none' }}>
                    <article style={{ display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr) auto', gap: '14px', alignItems: 'center', padding: '14px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '2px solid rgba(255,255,255,0.08)' }}>
                        {yorum.profil?.avatar_url
                          ? <img src={yorum.profil.avatar_url} alt={yorum.profil.kullanici_adi || 'Kullanıcı'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>{yorum.profil?.kullanici_adi?.[0]?.toUpperCase() || '•'}</div>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 800 }}>{yorum.profil?.kullanici_adi || 'Konsey üyesi'}</span>
                          <span style={{ color: '#8d8d87', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            {seri?.baslik || 'Seri'}
                          </span>
                        </div>
                        <div style={{ color: '#c5c5bf', fontSize: '13px', lineHeight: 1.7 }}>
                          {getCommentPreview(yorum)}
                        </div>
                      </div>
                      <div style={{ color: '#8d8d87', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'right' }}>
                        {formatDate(yorum.created_at)}
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          </section>
        </section>

        <style>{`
          @media (max-width: 960px) {
            .community-hero-grid {
              grid-template-columns: 1fr !important;
            }
            .community-series-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 640px) {
            .community-series-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
      <Footer />
    </>
  )
}
