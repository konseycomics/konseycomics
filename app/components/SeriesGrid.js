'use client'

const allSeries = [
  { slug: 'batman', title: 'Karanlık Şövalye: Dönüş', category: 'DC', color: '#111', label: 'BATMAN' },
  { slug: 'spider', title: 'İnanılmaz Örümcek', category: 'Marvel', color: '#e53e3e', label: 'SPIDER' },
  { slug: 'lookism', title: 'Sokakların Kralı', category: 'Webtoon', color: '#d97706', label: 'LOOKISM' },
  { slug: 'invincible', title: 'Yenilmez', category: 'Bağımsız', color: '#3b82f6', label: 'INVINCIBLE' },
  { slug: 'xmen', title: 'X-İnsanlar: Yıkım', category: 'Marvel', color: '#16a34a', label: 'X-MEN' },
  { slug: 'berserk', title: 'Yalnız Savaşçı', category: 'Manga', color: '#475569', label: 'BERSERK' },
  { slug: 'joker', title: 'Öldüren Şaka', category: 'DC', color: '#7c3aed', label: 'JOKER' },
  { slug: 'vagabond', title: 'Başıboş', category: 'Manga', color: '#475569', label: 'VAGABOND' },
  { slug: 'saga', title: 'Uzay Destanı', category: 'Bağımsız', color: '#ec4899', label: 'SAGA' },
  { slug: 'xmen', title: 'Yenilmez', category: 'Bağımsız', color: '#3b82f6', label: 'INVINCIBLE' },
]

export default function SeriesGrid({ filter }) {
  const filtered = filter === 'Tümü'
    ? allSeries
    : allSeries.filter(s => s.category === filter)

  return (
    <div style={{ margin: '36px 40px 0' }}>

      <div style={{ marginBottom: '36px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '20px',
        }}>
          <span style={{
            fontSize: '13px', fontWeight: 600,
            letterSpacing: '0.8px', textTransform: 'uppercase',
          }}>
            En Son Eklenenler
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
        }}>
          {filtered.slice(0, 5).map((series, i) => (
            <SeriesCard key={i} series={series} />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '60px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '20px',
        }}>
          <span style={{
            fontSize: '13px', fontWeight: 600,
            letterSpacing: '0.8px', textTransform: 'uppercase',
          }}>
            Popüler
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
        }}>
          {filtered.slice(0, 5).map((series, i) => (
            <SeriesCard key={i} series={series} />
          ))}
        </div>
      </div>

    </div>
  )
}

function SeriesCard({ series }) {
  return (
    <a href={`/seri/${series.slug}`} style={{ textDecoration: 'none', cursor: 'pointer' }}>
      <div style={{ transition: 'transform 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div style={{
          aspectRatio: '2/3',
          borderRadius: '10px', overflow: 'hidden',
          marginBottom: '10px',
          background: series.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '22px', color: '#fff', letterSpacing: '1px',
        }}>
          {series.label}
        </div>
        <div style={{
          fontSize: '13px', fontWeight: 500,
          color: 'var(--text)',
          marginBottom: '2px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {series.title}
        </div>
        <div style={{
          fontSize: '11px', fontWeight: 500,
          color: 'var(--text-light)',
          letterSpacing: '0.4px', textTransform: 'uppercase',
        }}>
          {series.category}
        </div>
      </div>
    </a>
  )
}