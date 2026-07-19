import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const TOKEN_HASH = 'a35e3cfec12fd7e80d731bf81040163a5f25b92127d47a738638f7026527204e'

function authorized(req) {
  const supplied = createHash('sha256').update(req.headers.get('x-setup-token') || '').digest()
  const expected = Buffer.from(TOKEN_HASH, 'hex')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

const GUIDES = [
  {
    forum: 'duyurular', slug: 'konsey-forum-kurallari', title: 'Konsey Forum Kuralları ve Topluluk Rehberi', tags: ['kurallar', 'duyuru'],
    body: `Konsey Forum, çizgi roman, manga, webtoon, dizi ve film seven herkesin rahatça konuşabildiği ortak alanımızdır.

1. Fikirlere karşı çıkabilirsin; kişilere saldırma. Hakaret, aşağılama, taciz ve nefret söylemi kaldırılır.
2. Hikâyenin önemli ayrıntılarını paylaşırken spoiler seçeneğini kullan.
3. Konuyu ilgili bölümde ve ne anlatacağını açıklayan bir başlıkla aç.
4. Aynı mesajı tekrar paylaşma, reklam ve bağlantı spamı yapma.
5. Başkasına ait çizim, çeviri veya içeriği paylaşırken kaynağını belirt.
6. Yasa dışı indirme bağlantıları ve kişisel bilgi paylaşımı yasaktır.
7. Sorunlu içerikleri tartışmayı büyütmeden Bildir düğmesiyle ekibe ilet.

Moderasyon işlemleri topluluğun güvenliği için kayıt altında tutulur. Burada herkesin sözü değerlidir; iyi tartışma merakla başlar, saygıyla devam eder.`,
  },
  {
    forum: 'cizgi-roman', slug: 'cizgi-roman-bolum-rehberi', title: 'Çizgi Roman Bölümü: Nereden Başlamalı, Nasıl Konu Açmalı?', tags: ['rehber', 'çizgi roman'],
    body: `Bu bölüm Marvel, DC ve bağımsız çizgi romanlar üzerine inceleme, teori, karakter karşılaştırması ve okuma önerileri içindir.

Başlıkta mümkünse seri ve sayı adını belirt. Yeni sayı konuşmalarında spoiler seçeneğini kullan. “Nereden başlamalıyım?” konularında sevdiğin karakterleri ve daha önce okuduklarını yazarsan daha iyi öneriler alırsın. Karşılaştırmalarda yalnızca güç seviyesine değil, hikâye bağlamına da yer ver.`,
  },
  {
    forum: 'manga-webtoon', slug: 'manga-webtoon-bolum-rehberi', title: 'Manga & Webtoon Bölümü: Paylaşım ve Spoiler Rehberi', tags: ['rehber', 'manga', 'webtoon'],
    body: `Manga ve webtoon serileri, haftalık bölümler, teoriler ve okuma önerileri burada konuşulur.

Henüz Türkçe yayımlanmamış bölümler için başlığa bölüm numarası ekle ve spoiler seçeneğini işaretle. Okuma önerisi isterken sevdiğin türleri belirt. Seri adlarının farklı çevirileri olabileceğini unutma; mümkünse orijinal adı da yaz. Korsan indirme bağlantısı paylaşma.`,
  },
  {
    forum: 'dizi-film', slug: 'dizi-film-bolum-rehberi', title: 'Dizi & Film Sohbet: Fragman, Uyarlama ve Spoiler Kuralları', tags: ['rehber', 'dizi', 'film'],
    body: `Diziler, filmler, çizgi roman uyarlamaları, oyuncu haberleri ve fragman analizleri bu bölümde konuşulur.

Yeni yayımlanan yapımların kritik olaylarını başlıkta açık etme. Fragman teorisi ile doğrulanmış haberi birbirinden ayır ve haber paylaşırken kaynak göster. Oyunculara veya diğer üyelere yönelik kişisel saldırılar yerine yapım ve performans üzerinden konuş.`,
  },
  {
    forum: 'genel-sohbet', slug: 'genel-sohbet-bolum-rehberi', title: 'Genel Sohbet: Tanış, Sor ve Muhabbete Katıl', tags: ['rehber', 'sohbet'],
    body: `Konsey üyeleriyle tanışmak, gündelik konuları konuşmak ve diğer bölümlere uymayan sohbetleri başlatmak için buradasın.

Kendini tanıtabilir, günün sorusunu sorabilir veya topluluğun fikrini merak ettiğin bir konuyu açabilirsin. Tartışmanın yönü değişirse yeni bir konu açmak sohbeti takip etmeyi kolaylaştırır. Kişisel bilgi paylaşırken dikkatli ol.`,
  },
  {
    forum: 'oneriler-istekler', slug: 'oneriler-istekler-bolum-rehberi', title: 'Öneri ve İstekler İçin Etkili Konu Açma Rehberi', tags: ['rehber', 'öneri'],
    body: `Site, çeviri seçkisi ve forum deneyimiyle ilgili önerilerini burada paylaşabilirsin.

Önerinin hangi sorunu çözdüğünü, beklediğin sonucu ve varsa örneğini açıkça yaz. Seri isteğinde eserin tam adını ve mümkünse yayın bilgisini ekle. Aynı öneri daha önce açıldıysa yeni konu yerine mevcut tartışmaya katkı sun.`,
  },
  {
    forum: 'cizim-koleksiyon', slug: 'cizim-koleksiyon-bolum-rehberi', title: 'Çizim ve Koleksiyon Paylaşım Rehberi', tags: ['rehber', 'çizim', 'koleksiyon'],
    body: `Çizimlerini, raf düzenini, figürlerini ve koleksiyon parçalarını toplulukla paylaşabilirsin.

Sana ait olmayan çalışmalarda sanatçıyı ve kaynağı belirt. Görsellerde adres, telefon veya sipariş belgesi gibi kişisel bilgilerin görünmediğinden emin ol. Satış ilanı ve ticari reklam yerine eserin veya koleksiyonun hikâyesine odaklan. Yapıcı geri bildirim verirken sanatçının emeğine saygı göster.`,
  },
]

export async function POST(req) {
  let stage = 'authorize'
  try {
    if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    stage = 'environment'
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) throw new Error('Supabase environment variables are missing.')
    if (req.headers.get('x-setup-diagnose') === '1') return NextResponse.json({ ok: true, stage: 'environment', hasUrl: Boolean(url), hasService: Boolean(service), version: 'bootstrap-v2' })
    stage = 'client'
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

    stage = 'profile_lookup'
    let { data: profile } = await admin.from('profiller').select('id, kullanici_adi').eq('kullanici_adi', 'peter_parker').maybeSingle()
    let userId = profile?.id
    if (!userId) {
      stage = 'auth_create'
      const authResponse = await fetch(`${url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'peter.parker@konseycomics.com',
          password: `${randomUUID()}Aa7!${randomUUID()}`,
          email_confirm: true,
          user_metadata: { kullanici_adi: 'peter_parker', display_name: 'Peter Parker' },
        }),
      })
      const created = await authResponse.json().catch(() => ({}))
      if (!authResponse.ok || !created?.id) throw new Error(created?.msg || created?.message || `Auth user creation failed (${authResponse.status}).`)
      userId = created.id
    }

    stage = 'profile_upsert'
    const { error: profileError } = await admin.from('profiller').upsert({
      id: userId,
      kullanici_adi: 'peter_parker',
      rol: 'moderator',
      bio: 'Konsey Forum topluluk yöneticisi. Dost canlısı mahalle moderatörünüz.',
    }, { onConflict: 'id' })
    if (profileError) throw profileError

    stage = 'team_upsert'
    const { data: existingTeam } = await admin.from('ekip').select('id').eq('profil_id', userId).maybeSingle()
    if (existingTeam?.id) await admin.from('ekip').update({ isim: 'Peter Parker', unvan: 'Topluluk Yöneticisi' }).eq('id', existingTeam.id)
    else await admin.from('ekip').insert({ isim: 'Peter Parker', unvan: 'Topluluk Yöneticisi', profil_id: userId })

    stage = 'forums_lookup'
    const { data: forums, error: forumError } = await admin.from('topluluk_forumlari').select('id, slug')
    if (forumError) throw forumError
    const forumMap = new Map((forums || []).map((forum) => [forum.slug, forum.id]))
    const rows = GUIDES.map((guide) => ({
      kullanici_id: userId,
      forum_id: forumMap.get(guide.forum),
      slug: guide.slug,
      baslik: guide.title,
      icerik: guide.body,
      kategori: guide.forum === 'duyurular' ? 'Duyurular' : guide.forum === 'cizgi-roman' ? 'Çizgi Roman' : guide.forum === 'manga-webtoon' ? 'Manga ve Webtoon' : guide.forum === 'dizi-film' ? 'Dizi & Film Sohbet' : guide.forum === 'genel-sohbet' ? 'Genel Sohbet' : guide.forum === 'oneriler-istekler' ? 'Öneriler ve İstekler' : 'Çizim ve Koleksiyonlar',
      etiketler: guide.tags,
      sabitlendi: true,
      aktif: true,
      spoiler: false,
    }))
    stage = 'topics_upsert'
    const { error: topicError } = await admin.from('topluluk_konulari').upsert(rows, { onConflict: 'slug' })
    if (topicError) throw topicError
    return NextResponse.json({ ok: true, userId, topics: rows.map((row) => row.slug) })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Bootstrap failed.', stage }, { status: 500 })
  }
}
