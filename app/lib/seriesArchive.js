export const ARCHIVE_FORMATS = [{ value: '', label: 'Tümü' }, { value: 'seri', label: 'Seriler' }, { value: 'tek', label: 'Tek Sayılıklar' }]
export const ARCHIVE_SORTS = [{ value: 'yeni', label: 'Son Eklenen' }, { value: 'az', label: 'A–Z' }, { value: 'okunan', label: 'En Çok Okunan' }, { value: 'populer', label: 'En Yüksek Puan' }, { value: 'degerlendirilen', label: 'En Çok Değerlendirilen' }]

export function archiveRatingScore(series, mean, priorVotes = 5) {
  const votes = Math.max(0, Number(series.puan_sayisi) || 0)
  const rating = Math.max(0, Math.min(10, Number(series.ortalama_puan) || 0))
  if (!votes) return 0
  // Five prior votes reduce the influence of very small samples.
  return (votes * rating + priorVotes * mean) / (votes + priorVotes)
}

export function normalizeArchiveText(value) {
  return String(value || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function archiveCategory(series) { return series.kategoriler?.isim || series.kategori || '' }
export function isArchiveSeries(series) { return !['manga', 'webtoon'].includes(normalizeArchiveText(archiveCategory(series))) }
export function isLocalSeries(series) { return normalizeArchiveText(archiveCategory(series)) === 'yerli eserler' }
export function archiveFormat(series) { return series.tur === 'tek' ? 'tek' : 'seri' }

export function archiveFilters(params) {
  const category = params.get('kategori') || params.get('evren') || params.get('filtre') || ''
  return {
    format: ['seri', 'tek'].includes(params.get('format')) ? params.get('format') : '',
    category: normalizeArchiveText(category) === 'tumu' ? '' : category,
    genre: params.get('tur') || '', status: params.get('durum') || '', local: params.get('yerli') === '1', query: params.get('q') || '',
    sort: ARCHIVE_SORTS.some(item => item.value === params.get('sirala')) ? params.get('sirala') : 'yeni',
  }
}

export function filterArchive(series, filters) {
  const query = normalizeArchiveText(filters.query).trim()
  const rated = series.filter(item => isArchiveSeries(item) && Number(item.puan_sayisi) > 0)
  const totalVotes = rated.reduce((sum, item) => sum + Number(item.puan_sayisi), 0)
  const mean = totalVotes ? rated.reduce((sum, item) => sum + (Number(item.ortalama_puan) || 0) * Number(item.puan_sayisi), 0) / totalVotes : 0
  return series.filter(item => {
    if (!isArchiveSeries(item)) return false
    if (filters.format && archiveFormat(item) !== filters.format) return false
    if (filters.category && normalizeArchiveText(archiveCategory(item)) !== normalizeArchiveText(filters.category)) return false
    if (filters.genre && !(item.turler || []).some(id => String(id) === filters.genre)) return false
    if (filters.status && item.durum !== filters.status) return false
    if (filters.local && !isLocalSeries(item)) return false
    return !query || normalizeArchiveText([item.baslik, item.ozet, archiveCategory(item)].join(' ')).includes(query)
  }).sort((a, b) => {
    if (filters.sort === 'az') return String(a.baslik || '').localeCompare(String(b.baslik || ''), 'tr')
    if (filters.sort === 'okunan') return Number(b.goruntuleme_sayisi || 0) - Number(a.goruntuleme_sayisi || 0)
    if (filters.sort === 'populer') return archiveRatingScore(b, mean) - archiveRatingScore(a, mean) || Number(b.puan_sayisi || 0) - Number(a.puan_sayisi || 0)
    if (filters.sort === 'degerlendirilen') return Number(b.puan_sayisi || 0) - Number(a.puan_sayisi || 0) || Number(b.ortalama_puan || 0) - Number(a.ortalama_puan || 0)
    return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0)
  })
}
