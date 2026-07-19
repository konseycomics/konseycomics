export const FORUM_SECTIONS = [
  {
    group: 'Konsey',
    forums: [
      {
        slug: 'duyurular',
        name: 'Duyurular ve Kurallar',
        category: 'Duyurular',
        aliases: ['Duyurular', 'Duyurular ve Kurallar'],
        description: 'Yönetim duyuruları, forum kuralları ve önemli bilgilendirmeler.',
        icon: 'megaphone',
        tone: 'gold',
        order: 10,
      },
    ],
  },
  {
    group: 'Okuma Evrenleri',
    forums: [
      {
        slug: 'cizgi-roman',
        name: 'Çizgi Roman',
        category: 'Çizgi Roman',
        aliases: ['Çizgi Roman', 'Marvel', 'DC Comics', 'Bağımsız Çizgi Romanlar'],
        description: 'Marvel, DC ve bağımsız çizgi roman evrenleri üzerine tartışmalar.',
        icon: 'panels',
        tone: 'red',
        order: 20,
      },
      {
        slug: 'manga-webtoon',
        name: 'Manga ve Webtoon',
        category: 'Manga ve Webtoon',
        aliases: ['Manga ve Webtoon', 'Manga', 'Webtoon'],
        description: 'Manga serileri, webtoon bölümleri, teoriler ve okur önerileri.',
        icon: 'book',
        tone: 'violet',
        order: 30,
      },
    ],
  },
  {
    group: 'Ekran Dünyası',
    forums: [
      {
        slug: 'dizi-film',
        name: 'Dizi & Film Sohbet',
        category: 'Dizi & Film Sohbet',
        aliases: ['Dizi & Film Sohbet', 'Dizi ve Film', 'Dizi & Film'],
        description: 'Diziler, filmler, uyarlamalar, fragmanlar ve ekran dünyasından gelişmeler.',
        icon: 'film',
        tone: 'cyan',
        order: 40,
      },
    ],
  },
  {
    group: 'Topluluk',
    forums: [
      {
        slug: 'genel-sohbet',
        name: 'Genel Sohbet',
        category: 'Genel Sohbet',
        aliases: ['Genel Sohbet'],
        description: 'Gündem, tanışma, serbest sohbet ve topluluğun ortak masası.',
        icon: 'message',
        tone: 'gold',
        order: 50,
      },
      {
        slug: 'oneriler-istekler',
        name: 'Öneriler ve İstekler',
        category: 'Öneriler ve İstekler',
        aliases: ['Öneriler ve İstekler'],
        description: 'Site, çeviri ve forum için görüşlerini Konsey ekibiyle paylaş.',
        icon: 'help',
        tone: 'white',
        order: 60,
      },
      {
        slug: 'cizim-koleksiyon',
        name: 'Çizim ve Koleksiyonlar',
        category: 'Çizim ve Koleksiyonlar',
        aliases: ['Çizim ve Koleksiyonlar'],
        description: 'Çizimlerini, rafını ve koleksiyon parçalarını toplulukla paylaş.',
        icon: 'pen',
        tone: 'orange',
        order: 70,
      },
    ],
  },
]

export const FORUMS = FORUM_SECTIONS.flatMap((section) => section.forums)

export function getForumBySlug(slug) {
  return FORUMS.find((forum) => forum.slug === String(slug || '')) || null
}

export function getForumForCategory(category) {
  const normalized = String(category || 'Genel Sohbet').trim().toLocaleLowerCase('tr-TR')
  return FORUMS.find((forum) => forum.aliases.some((alias) => alias.toLocaleLowerCase('tr-TR') === normalized)) || FORUMS.find((forum) => forum.slug === 'genel-sohbet')
}

export function topicBelongsToForum(topic, forum) {
  if (!forum) return true
  const category = String(topic?.kategori || 'Genel Sohbet').trim().toLocaleLowerCase('tr-TR')
  return forum.aliases.some((alias) => alias.toLocaleLowerCase('tr-TR') === category)
}
