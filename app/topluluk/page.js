import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { buildMetadata, createSeoDescription, createSupabaseServerClient } from '../lib/seo'
import { getLeaderboards } from '../lib/leaderboardData'
import { getCommunityTopics } from '../lib/communityData'
import ToplulukFeedClient from './ToplulukFeedClient'
import { unstable_noStore as noStore } from 'next/cache'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getCommentPreview(comment) {
  if (!comment?.icerik) return 'Yorum içeriği bulunamadı.'
  if (comment.spoiler) return 'Bu yorum spoiler içeriyor. Ayrıntılar için seri sayfasına geç.'
  const text = String(comment.icerik).trim()
  return text.length > 160 ? `${text.slice(0, 157).trim()}...` : text
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

  const [
    { data: latestComments },
    { data: weeklyComments },
    leaderboards,
    { count: totalMembers },
    { count: totalComments },
  ] = await Promise.all([
    supabase
      .from('yorumlar')
      .select('id, icerik, spoiler, created_at, kullanici_id, seri_id, seriler(id, baslik, slug, kapak_url)')
      .eq('silindi', false)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('yorumlar')
      .select('id, icerik, spoiler, created_at, kullanici_id, seri_id, seriler(id, baslik, slug, kapak_url)')
      .eq('silindi', false)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    getLeaderboards(),
    supabase.from('public_profiller').select('id', { count: 'exact', head: true }),
    supabase.from('yorumlar').select('id', { count: 'exact', head: true }).eq('silindi', false),
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
    .map((seri) => ({
      ...seri,
      sonYorumProfil: profileMap.get(seri.sonYorum?.kullanici_id) || null,
    }))
    .sort((a, b) => b.yorumSayisi - a.yorumSayisi || new Date(b.sonYorumAt) - new Date(a.sonYorumAt))

  const haftaninKonusu = populerKonular[0] || null
  const hareketliKonular = populerKonular.slice(0, 7)
  const aktifOkuyucular = (leaderboards.haftalik || []).slice(0, 5)
  const aktifUyeSayisi = new Set(haftalikYorumlar.map((yorum) => yorum.kullanici_id).filter(Boolean)).size
  const populerEtiketler = populerKonular.slice(0, 6).map((seri) => ({
    id: seri.id,
    label: seri.baslik,
    slug: seri.slug,
  }))

  return {
    haftaninKonusu,
    hareketliKonular,
    sonYorumlar: yorumlarWithProfiles.slice(0, 6),
    aktifOkuyucular,
    populerEtiketler,
    istatistikler: {
      toplamUye: totalMembers || 0,
      toplamYorum: totalComments || 0,
      aktifUye: aktifUyeSayisi,
      konusulanSeri: populerKonular.length,
    },
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
  const {
    haftaninKonusu,
    hareketliKonular,
    aktifOkuyucular,
  } = await getCommunityData()
  const { topics: gerçekKonular } = await getCommunityTopics({ limit: 12 })

  const akışKartlari = hareketliKonular.slice(0, 5)
  const fallbackTopics = akışKartlari.map((seri) => ({
    id: `fallback-${seri.id}`,
    href: `/seri/${seri.slug}`,
    baslik: `${seri.baslik} hakkında ne düşünüyorsunuz?`,
    icerik: getCommentPreview(seri.sonYorum),
    kategori: 'Seri Tartışmaları',
    etiketler: seri.baslik.split(' ').slice(0, 2),
    created_at: seri.sonYorumAt,
    son_aktivite_at: seri.sonYorumAt,
    yanit_sayisi: Number(seri.yorumSayisi || 0),
    begeni_sayisi: Math.max(Number(seri.yorumSayisi || 0) * 2, 6),
    goruntulenme_sayisi: 0,
    profil: seri.sonYorumProfil || null,
    source: 'fallback',
  }))
  const feedTopics = gerçekKonular.length > 0 ? gerçekKonular : fallbackTopics
  const kurallar = [
    {
      title: 'Spoiler Dengesini Koru',
      text: 'Yeni çıkan bölümler ve büyük kırılma anlarında spoiler uyarısı koy. Herkesin okuma keyfini birlikte koruyalım.',
    },
    {
      title: 'İşi Değil Fikri Tartış',
      text: 'Eleştiri serbest ama kişiselleştirmeden. Yorum değil tartışma kalitesi öne çıksın istiyoruz.',
    },
    {
      title: 'Kaynak ve Emeğe Saygı',
      text: 'Çeviri, edit ve topluluk emeğine saygılı kal. Kısa, net ve katkı sağlayan paylaşımlar en çok öne çıkar.',
    },
  ]
  const kategoriListesi = [
    'Genel Sohbet',
    'Çizgi Roman Tartışmaları',
    'Seri Önerileri',
    'Haberler & Duyurular',
    'Etkinlikler',
    'Çizimler & Fanart',
    'Teknik Destek',
  ]
  const populerKonular = [...feedTopics]
    .sort((a, b) => Number(b.yanit_sayisi || 0) - Number(a.yanit_sayisi || 0) || new Date(b.son_aktivite_at || b.created_at) - new Date(a.son_aktivite_at || a.created_at))
    .slice(0, 3)

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', minHeight: '100vh' }}>
        <section className="site-shell" style={{ paddingTop: '28px', paddingBottom: '34px' }}>
          <div className="community-layout-v3" style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '28px', alignItems: 'start' }}>
            <aside style={{ position: 'sticky', top: '106px', alignSelf: 'start', display: 'grid', gap: '12px' }}>
              {kurallar.map((kural) => (
                <section key={kural.title} style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025))', boxShadow: '0 14px 36px rgba(0,0,0,0.16)' }}>
                  <div style={{ color: '#fff', fontSize: '17px', fontWeight: 800, marginBottom: '8px' }}>{kural.title}</div>
                  <div style={{ color: '#b8b8b2', fontSize: '13px', lineHeight: 1.7 }}>{kural.text}</div>
                </section>
              ))}

              <section style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))' }}>
                <div style={{ color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Kategoriler
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {kategoriListesi.map((kategori) => (
                    <div key={kategori} style={{ minHeight: '44px', display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', color: '#d9d9d3', fontSize: '14px', fontWeight: 600 }}>
                      {kategori}
                    </div>
                  ))}
                </div>
              </section>

              <section style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))' }}>
                <div style={{ color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Popüler Konular
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {populerKonular.map((konu) => (
                    <Link key={konu.id} href={konu.href || `/topluluk/konu/${konu.slug}`} style={{ textDecoration: 'none' }}>
                      <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, lineHeight: 1.4, marginBottom: '4px' }}>{konu.baslik}</div>
                        <div style={{ color: '#a9a9a3', fontSize: '12px' }}>{Number(konu.yanit_sayisi || 0)} yorum</div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/topluluk" style={{ marginTop: '14px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '13px', fontWeight: 800, textDecoration: 'none', background: 'rgba(255,255,255,0.025)' }}>
                  Tümünü Gör
                </Link>
              </section>
            </aside>

            <section>
              <div style={{ marginBottom: '26px', textAlign: 'center' }}>
                <div style={{ color: '#9f9f98', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Konsey Sosyal
                </div>
                <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(44px, 6vw, 82px)', lineHeight: 0.92, fontFamily: 'var(--font-display)' }}>
                  Konu Oluştur
                </h1>
                <p style={{ margin: '12px auto 0', color: '#b8b8b2', fontSize: '15px', lineHeight: 1.8, maxWidth: '680px' }}>
                  Okuduklarını paylaş, teori bırak, öneri sor ya da sadece topluluğun nabzına katıl. Bu alan sitenin sosyal tarafı olacak.
                </p>
              </div>

              <ToplulukFeedClient initialTopics={feedTopics} />
            </section>
          </div>
        </section>

        <style>{`
          @media (max-width: 1080px) {
            .community-layout-v3 {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 900px) {
            .community-layout-v3 {
              gap: 18px !important;
            }
          }
        `}</style>
      </main>
      <Footer />
    </>
  )
}
