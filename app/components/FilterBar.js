'use client'

const filters = ['Tümü', 'Marvel', 'DC', 'Bağımsız', 'Manga', 'Webtoon']

export default function FilterBar({ active, setActive }) {
  return (
    <div style={{
      margin: '28px 40px 0',
      display: 'flex', gap: '6px', flexWrap: 'wrap',
      justifyContent: 'center',
    }}>
      {filters.map(filter => (
        <button
          key={filter}
          onClick={() => setActive(filter)}
          style={{
            padding: '7px 14px',
            background: active === filter ? 'var(--text)' : 'var(--surface)',
            border: `1px solid ${active === filter ? 'var(--text)' : 'var(--border)'}`,
            borderRadius: '100px',
            fontSize: '13px', fontWeight: 500,
            color: active === filter ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          {filter}
        </button>
      ))}
    </div>
  )
}