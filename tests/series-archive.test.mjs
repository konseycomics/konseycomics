import test from 'node:test'
import assert from 'node:assert/strict'
import { archiveFilters, archiveFormat, filterArchive, isArchiveSeries } from '../app/lib/seriesArchive.js'

const rows = [
  { id: 'a', baslik: 'Şehir', tur: 'seri', kategori: 'manga', kategoriler: { isim: 'Marvel' }, turler: ['action'], durum: 'Devam Eden', goruntuleme_sayisi: 10, created_at: '2026-01-01', bolumler: [{ count: 1 }] },
  { id: 'b', baslik: 'Batman', tur: 'tek', kategoriler: { isim: 'DC' }, turler: ['action'], durum: 'Tek Sayılık', created_at: '2026-02-01' },
  { id: 'c', baslik: 'Yerli', tur: 'seri', kategoriler: { isim: 'Yerli Eserler' }, turler: ['fantasy'], durum: 'Tamamlandı', created_at: '2026-03-01' },
  { id: 'd', baslik: 'Manga', tur: 'seri', kategoriler: { isim: 'Manga' } },
]
const defaults = () => archiveFilters(new URLSearchParams())

test('format is explicit, not inferred from chapter count', () => {
  assert.equal(archiveFormat(rows[0]), 'seri')
  assert.deepEqual(filterArchive(rows, { ...defaults(), format: 'tek' }).map(item => item.id), ['b'])
})
test('joined category overrides legacy fields', () => {
  assert.equal(isArchiveSeries(rows[0]), true)
  assert.equal(isArchiveSeries(rows[3]), false)
  assert.deepEqual(filterArchive(rows, { ...defaults(), category: 'Marvel' }).map(item => item.id), ['a'])
})
test('genre, status, format and category filters intersect', () => {
  assert.deepEqual(filterArchive(rows, { ...defaults(), category: 'DC', genre: 'action', status: 'Tek Sayılık', format: 'tek' }).map(item => item.id), ['b'])
  assert.equal(filterArchive(rows, { ...defaults(), genre: 'fantasy', format: 'tek' }).length, 0)
})
test('local works remain in main archive and can be isolated', () => {
  assert.equal(filterArchive(rows, defaults()).length, 3)
  assert.deepEqual(filterArchive(rows, { ...defaults(), local: true }).map(item => item.id), ['c'])
})
test('Turkish search, date and popularity sorting work without mutating input', () => {
  assert.deepEqual(filterArchive(rows, { ...defaults(), query: 'sehir' }).map(item => item.id), ['a'])
  assert.deepEqual(filterArchive(rows, defaults()).map(item => item.id), ['c', 'b', 'a'])
  assert.equal(filterArchive(rows, { ...defaults(), sort: 'okunan' })[0].id, 'a')
  assert.equal(rows[0].id, 'a')
})
test('legacy URLs work and invalid options use safe defaults', () => {
  assert.equal(archiveFilters(new URLSearchParams('evren=DC')).category, 'DC')
  assert.equal(archiveFilters(new URLSearchParams('filtre=Tümü')).category, '')
  const filters = archiveFilters(new URLSearchParams('format=nope&sirala=nope'))
  assert.equal(filters.format, '')
  assert.equal(filters.sort, 'yeni')
})

test('weighted ratings prefer established high ratings over one perfect vote', () => {
  const series = [
    { id: 'single', tur: 'seri', puan_sayisi: 1, ortalama_puan: 10 },
    { id: 'established', tur: 'seri', puan_sayisi: 7, ortalama_puan: 9.5 },
    { id: 'baseline', tur: 'seri', puan_sayisi: 50, ortalama_puan: 7 },
    { id: 'unrated', tur: 'seri', puan_sayisi: 0, ortalama_puan: 10 },
  ]
  assert.deepEqual(filterArchive(series, { ...defaults(), sort: 'populer' }).map(item => item.id), ['established', 'single', 'baseline', 'unrated'])
  assert.equal(series[0].ortalama_puan, 10)
})

test('most reviewed sorts by count and breaks ties with actual rating', () => {
  const series = [
    { id: 'a', puan_sayisi: 7, ortalama_puan: 8 },
    { id: 'b', puan_sayisi: 7, ortalama_puan: 9 },
    { id: 'c', puan_sayisi: 1, ortalama_puan: 10 },
  ]
  assert.equal(archiveFilters(new URLSearchParams('sirala=degerlendirilen')).sort, 'degerlendirilen')
  assert.deepEqual(filterArchive(series, { ...defaults(), sort: 'degerlendirilen' }).map(item => item.id), ['b', 'a', 'c'])
})
