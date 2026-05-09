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

function StatBox({ label, value }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ color: '#8f8f89', fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '32px', lineHeight: 0.9 }}>
        {value}
      </div>
    </div>
  )
}

export default async function ToplulukPage() {
  const {
    haftaninKonusu,
    hareketliKonular,
    sonYorumlar,
    aktifOkuyucular,
    populerEtiketler,
    istatistikler,
  } = await getCommunityData()

  const solMenu = [
    { label: 'Anasayfa', href: '/topluluk' },
    { label: 'Kesfet', href: '#kesfet' },
    { label: 'Bildirimler', href: '/giris' },
    { label: 'Mesajlar', href: '/giris' },
    { label: 'Yer Imleri', href: '/giris' },
    { label: 'Profilim', href: '/giris' },
  ]

  const kategoriListesi = [
    'Genel Sohbet',
    'Cizgi Roman Tartismalari',
    'Seri Onerileri',
    'Haberler & Duyurular',
    'Etkinlikler',
    'Cizimler & Fanart',
    'Teknik Destek',
  ]

  const onlineUyeler = [...aktifOkuyucular, ...sonYorumlar.map((yorum) => ({
    id: yorum.profil?.id,
    kullanici_adi: yorum.profil?.kullanici_adi,
    avatar_url: yorum.profil?.avatar_url,
    unvan: null,
    okumaSayisi: null,
  }))].filter((uye, index, arr) => uye?.id && arr.findIndex((item) => item?.id === uye.id) === index).slice(0, 6)

  const akışKartlari = hareketliKonular.slice(0, 5)
  const sagPopulerKonular = hareketliKonular.slice(0, 5)
  const sonRozetler = aktifOkuyucular.filter((uye) => uye.unvan).slice(0, 3)
  const etkinlikler = [
    { baslik: 'Canli Okuma: Haftanin Serisi', tarih: 'Pazar · 21:00' },
    { baslik: 'Topluluk Oneri Gecesi', tarih: 'Carsamba · 20:30' },
    { baslik: 'Editor Soru-Cevap', tarih: 'Cumartesi · 19:00' },
  ]

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', minHeight: '100vh' }}>
        <section className="site-shell" style={{ paddingTop: '28px', paddingBottom: '34px' }}>
          <div className="community-layout" style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr) 300px', gap: '20px', alignItems: 'start' }}>
            <aside className="community-sidebar" style={{ position: 'sticky', top: '106px', alignSelf: 'start' }}>
              <div style={{ paddingRight: '18px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                <Link href={haftaninKonusu ? `/seri/${haftaninKonusu.slug}` : '/seriler'} style={{ minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', background: '#fff', color: '#111', textDecoration: 'none', fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>
                  + Konu Olustur
                </Link>

                <div style={{ display: 'grid', gap: '8px', marginBottom: '24px' }}>
                  {solMenu.map((item, index) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      style={{
                        minHeight: '46px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 16px',
                        borderRadius: '12px',
                        background: index === 0 ? 'rgba(255,255,255,0.06)' : 'transparent',
                        color: '#f4f4f1',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        border: index === 0 ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div style={{ paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
                  <div style={{ color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Kategoriler
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {kategoriListesi.map((kategori) => (
                      <span key={kategori} style={{ minHeight: '42px', display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', color: '#d8d8d3', fontSize: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {kategori}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
                  <div style={{ color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Popüler Etiketler
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {populerEtiketler.map((etiket) => (
                      <Link key={etiket.id} href={`/seri/${etiket.slug}`} style={{ textDecoration: 'none' }}>
                        <span style={{ minHeight: '30px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d8d8d3', fontSize: '11px', fontWeight: 700 }}>
                          {etiket.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>
                    Topluluk Kurallari
                  </div>
                  <div style={{ color: '#b8b8b2', fontSize: '13px', lineHeight: 1.7, marginBottom: '14px' }}>
                    Daha temiz ve daha iyi bir ortam için temel kurallarımız burada.
                  </div>
                  <span style={{ minHeight: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                    Kurallari Incele
                  </span>
                </div>
              </div>
            </aside>

            <section>
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(38px, 5vw, 58px)', lineHeight: 0.95, fontFamily: 'var(--font-display)' }}>
                  Topluluk
                </h1>
                <p style={{ margin: '10px 0 0', color: '#b8b8b2', fontSize: '15px', lineHeight: 1.8 }}>
                  Çizgi roman tutkunlarının bir araya geldiği yer.
                </p>
              </div>

              <div style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr) auto', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>
                    K
                  </div>
                  <div>
                    <div style={{ color: '#d9d9d4', fontSize: '18px', marginBottom: '12px' }}>Ne hakkında konuşmak istersin?</div>
                    <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', color: '#b3b3ad', fontSize: '13px' }}>
                      <span>Fotograf</span>
                      <span>Anket</span>
                      <span>Etiket</span>
                    </div>
                  </div>
                  <button style={{ minHeight: '42px', padding: '0 16px', borderRadius: '12px', border: 'none', background: '#fff', color: '#111', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit' }}>
                    Paylas
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '22px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px', paddingBottom: '10px', color: '#b3b3ad', fontSize: '14px', overflowX: 'auto' }}>
                <span style={{ color: '#fff', fontWeight: 700, paddingBottom: '10px', borderBottom: '2px solid #fff' }}>Tumu</span>
                <span>Takip Edilen</span>
                <span>Populer</span>
                <span>En Yeni</span>
              </div>

              <div id="son-aktiviteler" style={{ display: 'grid', gap: '14px' }}>
                {akışKartlari.map((seri) => (
                  <Link key={seri.id} href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
                    <article style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr) auto', gap: '14px', alignItems: 'start' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {seri.sonYorumProfil?.avatar_url
                            ? <img src={seri.sonYorumProfil.avatar_url} alt={seri.sonYorumProfil.kullanici_adi || 'Profil'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>{seri.sonYorumProfil?.kullanici_adi?.[0]?.toUpperCase() || 'K'}</div>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{seri.sonYorumProfil?.kullanici_adi || 'Konsey Uyesi'}</span>
                            <span style={{ color: '#a4a49e', fontSize: '12px' }}>{formatDateTime(seri.sonYorumAt)}</span>
                          </div>
                          <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, lineHeight: 1.35, marginBottom: '8px' }}>
                            {seri.baslik} hakkında ne düşünüyorsunuz?
                          </div>
                          <div style={{ color: '#c2c2bc', fontSize: '14px', lineHeight: 1.75, marginBottom: '12px' }}>
                            {getCommentPreview(seri.sonYorum)}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {seri.baslik.split(' ').slice(0, 2).map((tag) => (
                              <span key={tag} style={{ minHeight: '28px', display: 'inline-flex', alignItems: 'center', padding: '0 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#d5d5d0', fontSize: '11px', fontWeight: 700 }}>
                                {tag.toLowerCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gap: '10px', minWidth: '96px' }}>
                          <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                            <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '30px', lineHeight: 0.9 }}>{seri.yorumSayisi}</div>
                            <div style={{ color: '#a7a7a1', fontSize: '10px', letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: '4px' }}>yorum</div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>

            <aside className="community-right-rail" style={{ position: 'sticky', top: '106px', alignSelf: 'start', display: 'grid', gap: '16px' }}>
              <section style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>Online Uyeler</div>
                <div style={{ color: '#9fd67d', fontSize: '13px', marginBottom: '14px' }}>{istatistikler.aktifUye || onlineUyeler.length} çevrimiçi</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {onlineUyeler.map((uye) => (
                    <Link key={uye.id} href={uye.kullanici_adi ? `/profil/${uye.kullanici_adi}` : '/giris'} style={{ textDecoration: 'none' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '2px solid rgba(255,255,255,0.08)' }}>
                        {uye.avatar_url
                          ? <img src={uye.avatar_url} alt={uye.kullanici_adi || 'Üye'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>{uye.kullanici_adi?.[0]?.toUpperCase() || '+'}</div>}
                      </div>
                    </Link>
                  ))}
                  <div style={{ minWidth: '42px', height: '42px', padding: '0 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    +{Math.max(0, istatistikler.toplamUye - onlineUyeler.length)}
                  </div>
                </div>
              </section>

              <section style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '14px' }}>Popüler Konular</div>
                <div style={{ display: 'grid', gap: '14px' }}>
                  {sagPopulerKonular.map((seri) => (
                    <Link key={seri.id} href={`/seri/${seri.slug}`} style={{ display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr)', gap: '10px', textDecoration: 'none' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', background: '#111' }}>
                        {seri.kapak_url
                          ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : null}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700, lineHeight: 1.35, marginBottom: '4px' }}>{seri.baslik} hakkında ne düşünüyorsunuz?</div>
                        <div style={{ color: '#b5b5af', fontSize: '13px' }}>{seri.yorumSayisi} yorum</div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div style={{ marginTop: '16px' }}>
                  <span style={{ minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                    Tümünü Gör
                  </span>
                </div>
              </section>

              <section style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '14px' }}>Yaklaşan Etkinlikler</div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {etkinlikler.map((etkinlik) => (
                    <div key={etkinlik.baslik}>
                      <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700, lineHeight: 1.35, marginBottom: '4px' }}>{etkinlik.baslik}</div>
                      <div style={{ color: '#b5b5af', fontSize: '13px' }}>{etkinlik.tarih}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '14px' }}>Son Rozetler</div>
                <div style={{ display: 'grid', gap: '14px' }}>
                  {sonRozetler.length > 0 ? sonRozetler.map((uye) => (
                    <Link key={uye.id} href={`/profil/${uye.kullanici_adi}`} style={{ display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr)', gap: '10px', textDecoration: 'none' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', background: '#111' }}>
                        {uye.avatar_url
                          ? <img src={uye.avatar_url} alt={uye.kullanici_adi} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : null}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700, lineHeight: 1.35 }}>{uye.unvan}</div>
                        <div style={{ color: '#b5b5af', fontSize: '13px', marginTop: '4px' }}>{uye.kullanici_adi}</div>
                      </div>
                    </Link>
                  )) : (
                    <div style={{ color: '#b5b5af', fontSize: '13px', lineHeight: 1.7 }}>
                      Rozet akışı yakında burada görünecek.
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </section>

        <style>{`
          @media (max-width: 1260px) {
            .community-layout {
              grid-template-columns: 1fr !important;
            }

            .community-sidebar,
            .community-right-rail {
              position: static !important;
            }
          }

          @media (max-width: 860px) {
            .community-layout {
              gap: 18px !important;
            }

            .community-topic-card {
              grid-template-columns: 1fr !important;
            }

            .community-topic-meta {
              min-width: 0 !important;
            }
          }

          @media (max-width: 640px) {
            .community-layout {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
      <Footer />
    </>
  )
}
