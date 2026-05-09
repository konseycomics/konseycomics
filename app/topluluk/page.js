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

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', minHeight: '100vh' }}>
        <section className="site-shell" style={{ paddingTop: '34px', paddingBottom: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div style={{ maxWidth: '760px' }}>
                <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Topluluk
                </div>
                <h1 style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 7vw, 82px)', lineHeight: 0.92, textTransform: 'uppercase' }}>
                  Konsey Topluluk
                </h1>
                <p style={{ maxWidth: '68ch', margin: '12px 0 0', color: '#b8b8b2', fontSize: '15px', lineHeight: 1.8 }}>
                  Çizgi roman, manga ve webtoon konuşmaları burada akıyor. En çok hareketlenen serileri, son yorumları ve topluluğun nabzını tek yerde toplayalım.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link href={haftaninKonusu ? `/seri/${haftaninKonusu.slug}` : '/seriler'} style={{ minHeight: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px', borderRadius: '14px', background: '#fff', color: '#111', textDecoration: 'none', fontSize: '12px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  + Konu Aç
                </Link>
                <Link href="#son-aktiviteler" style={{ minHeight: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Son Aktivitelere Git
                </Link>
              </div>
            </div>

            <div className="community-top-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(300px, 0.85fr)', gap: '18px' }}>
              <section style={{ padding: '22px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', boxShadow: '0 18px 40px rgba(0,0,0,0.18)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ minHeight: '52px', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(0,0,0,0.35)', color: '#8f8f89', fontSize: '14px' }}>
                    Konularda ara, seri adı yaz veya doğrudan tartışmaya dal...
                  </div>
                  <div style={{ minHeight: '52px', minWidth: '120px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase' }}>
                    En Yeni
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {populerEtiketler.map((etiket) => (
                    <Link key={etiket.id} href={`/seri/${etiket.slug}`} style={{ textDecoration: 'none' }}>
                      <span style={{ minHeight: '30px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#d8d8d3', fontSize: '10px', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase' }}>
                        {etiket.label}
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="community-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                  <article style={{ padding: '18px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Genel Sohbet</div>
                    <div style={{ color: '#a4a49e', fontSize: '13px', lineHeight: 1.7 }}>
                      Güncel okuma, kısa fikirler ve hızlı yorumlar burada toplanıyor.
                    </div>
                    <div style={{ color: '#f5b942', fontSize: '11px', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: '12px' }}>
                      {istatistikler.toplamYorum} toplam yorum
                    </div>
                  </article>

                  <article style={{ padding: '18px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Seri Tartışmaları</div>
                    <div style={{ color: '#a4a49e', fontSize: '13px', lineHeight: 1.7 }}>
                      Son 7 günde konuşulan seriler öne çıkıyor, yeni yorumla akış değişiyor.
                    </div>
                    <div style={{ color: '#f5b942', fontSize: '11px', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: '12px' }}>
                      {istatistikler.konusulanSeri} hareketli seri
                    </div>
                  </article>

                  <article style={{ padding: '18px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Aktif Okurlar</div>
                    <div style={{ color: '#a4a49e', fontSize: '13px', lineHeight: 1.7 }}>
                      Sadece konuşanlar değil, gerçekten okuyup geri dönen çekirdek kitle burada.
                    </div>
                    <div style={{ color: '#f5b942', fontSize: '11px', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: '12px' }}>
                      {aktifOkuyucular.length} öne çıkan üye
                    </div>
                  </article>
                </div>
              </section>

              <aside style={{ padding: '22px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', boxShadow: '0 18px 40px rgba(0,0,0,0.18)' }}>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Topluluk İstatistikleri</div>
                <div style={{ color: '#9d9d97', fontSize: '13px', lineHeight: 1.7, marginBottom: '14px' }}>
                  Şu an canlı olan topluluk ritmini tek bakışta görelim.
                </div>
                <div className="community-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '16px' }}>
                  <StatBox label="Toplam Üye" value={istatistikler.toplamUye} />
                  <StatBox label="Toplam Yorum" value={istatistikler.toplamYorum} />
                  <StatBox label="Aktif Üye" value={istatistikler.aktifUye} />
                  <StatBox label="Konuşulan Seri" value={istatistikler.konusulanSeri} />
                </div>
                {haftaninKonusu ? (
                  <div style={{ padding: '16px', borderRadius: '20px', border: '1px solid rgba(245,185,66,0.22)', background: 'linear-gradient(180deg, rgba(245,185,66,0.12), rgba(245,185,66,0.04))' }}>
                    <div style={{ color: '#f5b942', fontSize: '11px', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Haftanın Konusu
                    </div>
                    <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, lineHeight: 1.35, marginBottom: '8px' }}>
                      {haftaninKonusu.baslik}
                    </div>
                    <div style={{ color: '#d0d0cb', fontSize: '13px', lineHeight: 1.7 }}>
                      {haftaninKonusu.yorumSayisi} yorum aldı, son hareket {formatDateTime(haftaninKonusu.sonYorumAt)}.
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>

          <div className="community-main-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.18fr) minmax(280px, 0.82fr)', gap: '18px' }}>
            <section id="son-aktiviteler">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 0.92 }}>Son Aktiviteler</div>
                  <div style={{ color: '#9f9f99', fontSize: '13px', marginTop: '6px' }}>Yorumlardan beslenen, yaşayan tartışma akışı.</div>
                </div>
                <div style={{ color: '#8e8e88', fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  {hareketliKonular.length} aktif konu
                </div>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {hareketliKonular.map((seri, index) => (
                  <Link key={seri.id} href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
                    <article className="community-topic-card" style={{ display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr) auto', gap: '16px', alignItems: 'center', padding: '16px 18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))', boxShadow: '0 14px 30px rgba(0,0,0,0.16)' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '18px', overflow: 'hidden', background: '#101010', position: 'relative' }}>
                        {seri.kapak_url
                          ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, textAlign: 'center', padding: '8px' }}>{seri.baslik}</div>}
                        <div style={{ position: 'absolute', insetInlineStart: '6px', top: '6px', minHeight: '22px', padding: '0 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.82)', color: '#fff', fontSize: '10px', fontWeight: 800, letterSpacing: '0.7px' }}>
                          #{index + 1}
                        </div>
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          {index === 0 ? (
                            <span style={{ minHeight: '22px', padding: '0 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', background: 'rgba(245,185,66,0.14)', color: '#f5b942', fontSize: '10px', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase' }}>
                              Gündem
                            </span>
                          ) : null}
                          <span style={{ color: '#8f8f89', fontSize: '11px', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase' }}>
                            {seri.sonYorumProfil?.kullanici_adi || 'Konsey üyesi'} · {formatDateTime(seri.sonYorumAt)}
                          </span>
                        </div>
                        <div style={{ color: '#fff', fontSize: '20px', fontWeight: 800, lineHeight: 1.25, marginBottom: '8px' }}>
                          {seri.baslik} hakkında neler dönüyor?
                        </div>
                        <div style={{ color: '#c0c0bb', fontSize: '14px', lineHeight: 1.7, maxWidth: '70ch' }}>
                          {getCommentPreview(seri.sonYorum)}
                        </div>
                      </div>

                      <div className="community-topic-meta" style={{ display: 'grid', gap: '10px', minWidth: '110px' }}>
                        <div style={{ padding: '12px 14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', textAlign: 'right' }}>
                          <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '32px', lineHeight: 0.88 }}>{seri.yorumSayisi}</div>
                          <div style={{ color: '#ababa5', fontSize: '10px', letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: '4px' }}>yorum</div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>

            <aside className="community-rail-stack" style={{ display: 'grid', gap: '18px', alignContent: 'start' }}>
              <section style={{ padding: '20px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>En Aktif Okuyucular</div>
                <div style={{ color: '#9d9d97', fontSize: '13px', lineHeight: 1.7, marginBottom: '14px' }}>
                  Bu hafta okuyup geri dönen çekirdek topluluk.
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {aktifOkuyucular.map((uye, index) => (
                    <Link key={uye.id} href={`/profil/${uye.kullanici_adi}`} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '28px 42px minmax(0, 1fr) auto', gap: '10px', alignItems: 'center', padding: '10px 12px', borderRadius: '18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ color: '#8f8f8a', fontSize: '12px', fontWeight: 900 }}>#{index + 1}</div>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '2px solid rgba(255,255,255,0.1)' }}>
                          {uye.avatar_url
                            ? <img src={uye.avatar_url} alt={uye.kullanici_adi} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>{uye.kullanici_adi?.[0]?.toUpperCase()}</div>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#fff', fontSize: '14px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uye.kullanici_adi}</div>
                          {uye.unvan ? <div style={{ color: '#9f9f99', fontSize: '11px', marginTop: '4px' }}>{uye.unvan}</div> : null}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '24px', lineHeight: 0.92 }}>{uye.okumaSayisi}</div>
                          <div style={{ color: '#bcbcb6', fontSize: '10px', letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: '4px' }}>okuma</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section style={{ padding: '20px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Popüler Etiketler</div>
                <div style={{ color: '#9d9d97', fontSize: '13px', lineHeight: 1.7, marginBottom: '14px' }}>
                  En çok konuşulan serilerden oluşan hızlı geçiş noktaları.
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {populerEtiketler.map((etiket) => (
                    <Link key={etiket.id} href={`/seri/${etiket.slug}`} style={{ textDecoration: 'none' }}>
                      <span style={{ minHeight: '32px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#e0e0db', fontSize: '10px', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase' }}>
                        {etiket.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>

          <section style={{ marginTop: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 44px)', lineHeight: 0.92 }}>Son Yorumlar</div>
              <div style={{ color: '#9f9f99', fontSize: '13px', marginTop: '6px' }}>Akıştaki son bireysel yorumlar.</div>
            </div>
            <div className="community-comment-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              {sonYorumlar.map((yorum) => {
                const seri = Array.isArray(yorum.seriler) ? yorum.seriler[0] : yorum.seriler
                return (
                  <Link key={yorum.id} href={seri?.slug ? `/seri/${seri.slug}` : '/seriler'} style={{ textDecoration: 'none' }}>
                    <article style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr)', gap: '14px', alignItems: 'start', padding: '16px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '2px solid rgba(255,255,255,0.08)' }}>
                        {yorum.profil?.avatar_url
                          ? <img src={yorum.profil.avatar_url} alt={yorum.profil.kullanici_adi || 'Kullanıcı'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>{yorum.profil?.kullanici_adi?.[0]?.toUpperCase() || '•'}</div>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                          <div>
                            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 800 }}>{yorum.profil?.kullanici_adi || 'Konsey üyesi'}</div>
                            <div style={{ color: '#8d8d87', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '4px' }}>
                              {seri?.baslik || 'Seri'}
                            </div>
                          </div>
                          <div style={{ color: '#8d8d87', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'right' }}>
                            {formatDate(yorum.created_at)}
                          </div>
                        </div>
                        <div style={{ color: '#c5c5bf', fontSize: '13px', lineHeight: 1.75 }}>
                          {getCommentPreview(yorum)}
                        </div>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          </section>
        </section>

        <style>{`
          @media (max-width: 1080px) {
            .community-top-grid,
            .community-main-grid {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 860px) {
            .community-feature-grid,
            .community-comment-grid {
              grid-template-columns: 1fr !important;
            }

            .community-stat-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .community-topic-card {
              grid-template-columns: 56px minmax(0, 1fr) !important;
            }

            .community-topic-meta {
              grid-column: 2 / 3;
              min-width: 0 !important;
            }
          }

          @media (max-width: 640px) {
            .community-stat-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
      <Footer />
    </>
  )
}
