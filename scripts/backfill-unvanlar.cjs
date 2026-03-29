const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const EVENT = {
  SERIES_PROGRESS_UPDATED: 'SERIES_PROGRESS_UPDATED',
  SERIES_COMPLETED: 'SERIES_COMPLETED',
  SERIES_RATED: 'SERIES_RATED',
  SERIES_FAVORITED: 'SERIES_FAVORITED',
}

const RULE = {
  SERIES_PROGRESS: 'series_progress',
  SERIES_COMPLETED: 'series_completed',
  CHARACTER_SERIES_COMPLETED_COUNT: 'character_series_completed_count',
  RATE_COUNT_IN_GROUP: 'rate_count_in_group',
  FAVORITE_COUNT_IN_GROUP: 'favorite_count_in_group',
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function safeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function buildSnapshot({
  eventType,
  userId,
  seriesId = null,
  bolumId = null,
  characterGroup = null,
  progressPercent = 0,
  isCompleted = false,
  completedSeriesCount = 0,
  ratingsCountInGroup = 0,
  favoritesCountInGroup = 0,
}) {
  return {
    eventType,
    userId,
    seriesId,
    bolumId,
    characterGroup: normalizeText(characterGroup),
    progressPercent: safeNumber(progressPercent, 0),
    isCompleted: Boolean(isCompleted),
    completedSeriesCount: safeNumber(completedSeriesCount, 0),
    ratingsCountInGroup: safeNumber(ratingsCountInGroup, 0),
    favoritesCountInGroup: safeNumber(favoritesCountInGroup, 0),
  }
}

function evaluateRule(rule, snapshot) {
  const config = rule.kural_config || {}

  switch (rule.kural_tipi) {
    case RULE.SERIES_PROGRESS:
      return String(snapshot.seriesId) === String(config.series_id) &&
        safeNumber(snapshot.progressPercent, 0) >= safeNumber(config.min_progress_percent, 100)
    case RULE.SERIES_COMPLETED:
      return String(snapshot.seriesId) === String(config.series_id) && snapshot.isCompleted === true
    case RULE.CHARACTER_SERIES_COMPLETED_COUNT:
      return normalizeText(snapshot.characterGroup) === normalizeText(config.character_group) &&
        safeNumber(snapshot.completedSeriesCount, 0) >= safeNumber(config.min_completed_series, 1)
    case RULE.RATE_COUNT_IN_GROUP:
      return normalizeText(snapshot.characterGroup) === normalizeText(config.character_group) &&
        safeNumber(snapshot.ratingsCountInGroup, 0) >= safeNumber(config.min_ratings_count, 1)
    case RULE.FAVORITE_COUNT_IN_GROUP:
      return normalizeText(snapshot.characterGroup) === normalizeText(config.character_group) &&
        safeNumber(snapshot.favoritesCountInGroup, 0) >= safeNumber(config.min_favorites_count, 1)
    default:
      return false
  }
}

function buildUnlockReason(rule, snapshot) {
  return {
    trigger_event: snapshot.eventType,
    rule_type: rule.kural_tipi,
    series_id: snapshot.seriesId,
    bolum_id: snapshot.bolumId,
    character_group: snapshot.characterGroup,
    progress_percent: snapshot.progressPercent,
    completed_series_count: snapshot.completedSeriesCount,
    ratings_count_in_group: snapshot.ratingsCountInGroup,
    favorites_count_in_group: snapshot.favoritesCountInGroup,
    unlocked_at: new Date().toISOString(),
  }
}

async function fetchAll(table, queryBuilder) {
  const pageSize = 1000
  let from = 0
  let results = []

  while (true) {
    const { data, error } = await queryBuilder()
      .range(from, from + pageSize - 1)

    if (error) throw error
    const page = data || []
    results = results.concat(page)
    if (page.length < pageSize) break
    from += pageSize
  }

  return results
}

async function main() {
  const [
    profiles,
    series,
    bolumler,
    reads,
    ratings,
    readingList,
    titles,
    rules,
    existingUserTitles,
  ] = await Promise.all([
    fetchAll('profiller', () => supabase.from('profiller').select('id')),
    fetchAll('seriler', () => supabase.from('seriler').select('id, baslik, character_group')),
    fetchAll('bolumler', () => supabase.from('bolumler').select('id, seri_id')),
    fetchAll('okuma_gecmisi', () => supabase.from('okuma_gecmisi').select('kullanici_id, bolum_id, seri_id, okundu_at')),
    fetchAll('seri_puanlari', () => supabase.from('seri_puanlari').select('kullanici_id, seri_id')),
    fetchAll('okuma_listesi', () => supabase.from('okuma_listesi').select('kullanici_id, seri_id, durum')),
    fetchAll('unvan_tanimlari', () => supabase.from('unvan_tanimlari').select('id, kod, isim, aciklama, nadirlik')),
    fetchAll('unvan_kurallari', () => supabase.from('unvan_kurallari').select('id, unvan_id, event_tipi, kural_tipi, kural_config, aktif, oncelik').eq('aktif', true).order('oncelik')),
    fetchAll('kullanici_unvanlari', () => supabase.from('kullanici_unvanlari').select('kullanici_id, unvan_id')),
  ])

  const existingUnlockSet = new Set(existingUserTitles.map(item => `${item.kullanici_id}:${item.unvan_id}`))
  const titleById = new Map(titles.map(item => [item.id, item]))
  const seriesById = new Map(series.map(item => [item.id, item]))
  const totalIssuesBySeries = new Map()
  const readMap = new Map()

  for (const bolum of bolumler) {
    totalIssuesBySeries.set(bolum.seri_id, (totalIssuesBySeries.get(bolum.seri_id) || 0) + 1)
  }

  for (const read of reads) {
    const readKey = `${read.kullanici_id}:${read.bolum_id}`
    if (!readMap.has(readKey)) {
      readMap.set(readKey, read)
    }
  }

  const readRows = Array.from(readMap.values()).map(read => ({
    kullanici_id: read.kullanici_id,
    bolum_id: read.bolum_id,
    seri_id: read.seri_id,
    completion_ratio: 1,
    okuma_suresi_sec: 20,
    okundu_at: read.okundu_at || new Date().toISOString(),
  }))

  if (readRows.length) {
    const { error } = await supabase
      .from('kullanici_bolum_okumalari')
      .upsert(readRows, { onConflict: 'kullanici_id,bolum_id' })
    if (error) throw error
  }

  const progressMap = new Map()
  for (const read of readRows) {
    const key = `${read.kullanici_id}:${read.seri_id}`
    const entry = progressMap.get(key) || {
      kullanici_id: read.kullanici_id,
      seri_id: read.seri_id,
      okunanBolumIds: new Set(),
      ilk_okuma_at: read.okundu_at,
      son_okuma_at: read.okundu_at,
    }
    entry.okunanBolumIds.add(read.bolum_id)
    if (read.okundu_at < entry.ilk_okuma_at) entry.ilk_okuma_at = read.okundu_at
    if (read.okundu_at > entry.son_okuma_at) entry.son_okuma_at = read.okundu_at
    progressMap.set(key, entry)
  }

  const progressRows = Array.from(progressMap.values()).map(entry => {
    const toplam = Number(totalIssuesBySeries.get(entry.seri_id) || 0)
    const okunan = entry.okunanBolumIds.size
    const ilerleme = toplam > 0 ? Number(((okunan / toplam) * 100).toFixed(2)) : 0
    return {
      kullanici_id: entry.kullanici_id,
      seri_id: entry.seri_id,
      okunan_bolum_sayisi: okunan,
      toplam_bolum_sayisi: toplam,
      ilerleme_yuzdesi: ilerleme,
      tamamlandi: toplam > 0 && okunan >= toplam,
      ilk_okuma_at: entry.ilk_okuma_at,
      son_okuma_at: entry.son_okuma_at,
    }
  })

  if (progressRows.length) {
    const { error } = await supabase
      .from('kullanici_seri_ilerleme')
      .upsert(progressRows, { onConflict: 'kullanici_id,seri_id' })
    if (error) throw error
  }

  const completedCountsByUserGroup = new Map()
  const ratingsCountsByUserGroup = new Map()
  const favoriteCountsByUserGroup = new Map()

  for (const row of progressRows) {
    if (!row.tamamlandi) continue
    const characterGroup = normalizeText(seriesById.get(row.seri_id)?.character_group)
    if (!characterGroup) continue
    const key = `${row.kullanici_id}:${characterGroup}`
    completedCountsByUserGroup.set(key, (completedCountsByUserGroup.get(key) || 0) + 1)
  }

  for (const row of ratings) {
    const characterGroup = normalizeText(seriesById.get(row.seri_id)?.character_group)
    if (!characterGroup) continue
    const key = `${row.kullanici_id}:${characterGroup}`
    ratingsCountsByUserGroup.set(key, (ratingsCountsByUserGroup.get(key) || 0) + 1)
  }

  for (const row of readingList) {
    if (row.durum !== 'okumak_istiyorum') continue
    const characterGroup = normalizeText(seriesById.get(row.seri_id)?.character_group)
    if (!characterGroup) continue
    const key = `${row.kullanici_id}:${characterGroup}`
    favoriteCountsByUserGroup.set(key, (favoriteCountsByUserGroup.get(key) || 0) + 1)
  }

  const unlockRows = []
  const logRows = []

  for (const row of progressRows) {
    const seriesInfo = seriesById.get(row.seri_id)
    const characterGroup = normalizeText(seriesInfo?.character_group)
    const completedSeriesCount = completedCountsByUserGroup.get(`${row.kullanici_id}:${characterGroup}`) || 0

    const progressSnapshot = buildSnapshot({
      eventType: EVENT.SERIES_PROGRESS_UPDATED,
      userId: row.kullanici_id,
      seriesId: row.seri_id,
      characterGroup,
      progressPercent: row.ilerleme_yuzdesi,
      isCompleted: row.tamamlandi,
      completedSeriesCount,
    })

    for (const rule of rules.filter(item => item.event_tipi === EVENT.SERIES_PROGRESS_UPDATED)) {
      const title = titleById.get(rule.unvan_id)
      if (!title) continue
      const unlockKey = `${row.kullanici_id}:${title.id}`
      if (existingUnlockSet.has(unlockKey)) continue
      if (!evaluateRule(rule, progressSnapshot)) continue

      existingUnlockSet.add(unlockKey)
      const reason = buildUnlockReason(rule, progressSnapshot)
      unlockRows.push({ kullanici_id: row.kullanici_id, unvan_id: title.id, acilma_nedeni: reason })
      logRows.push({ kullanici_id: row.kullanici_id, event_tipi: progressSnapshot.eventType, seri_id: row.seri_id, payload: reason })
    }

    if (row.tamamlandi) {
      const completedSnapshot = buildSnapshot({
        eventType: EVENT.SERIES_COMPLETED,
        userId: row.kullanici_id,
        seriesId: row.seri_id,
        characterGroup,
        progressPercent: row.ilerleme_yuzdesi,
        isCompleted: true,
        completedSeriesCount,
      })

      for (const rule of rules.filter(item => item.event_tipi === EVENT.SERIES_COMPLETED)) {
        const title = titleById.get(rule.unvan_id)
        if (!title) continue
        const unlockKey = `${row.kullanici_id}:${title.id}`
        if (existingUnlockSet.has(unlockKey)) continue
        if (!evaluateRule(rule, completedSnapshot)) continue

        existingUnlockSet.add(unlockKey)
        const reason = buildUnlockReason(rule, completedSnapshot)
        unlockRows.push({ kullanici_id: row.kullanici_id, unvan_id: title.id, acilma_nedeni: reason })
        logRows.push({ kullanici_id: row.kullanici_id, event_tipi: completedSnapshot.eventType, seri_id: row.seri_id, payload: reason })
      }
    }
  }

  const ratedSeriesByUser = new Set()
  for (const row of ratings) {
    const uniq = `${row.kullanici_id}:${row.seri_id}`
    if (ratedSeriesByUser.has(uniq)) continue
    ratedSeriesByUser.add(uniq)

    const seriesInfo = seriesById.get(row.seri_id)
    const characterGroup = normalizeText(seriesInfo?.character_group)
    const ratingsCountInGroup = ratingsCountsByUserGroup.get(`${row.kullanici_id}:${characterGroup}`) || 0
    const snapshot = buildSnapshot({
      eventType: EVENT.SERIES_RATED,
      userId: row.kullanici_id,
      seriesId: row.seri_id,
      characterGroup,
      ratingsCountInGroup,
    })

    for (const rule of rules.filter(item => item.event_tipi === EVENT.SERIES_RATED)) {
      const title = titleById.get(rule.unvan_id)
      if (!title) continue
      const unlockKey = `${row.kullanici_id}:${title.id}`
      if (existingUnlockSet.has(unlockKey)) continue
      if (!evaluateRule(rule, snapshot)) continue

      existingUnlockSet.add(unlockKey)
      const reason = buildUnlockReason(rule, snapshot)
      unlockRows.push({ kullanici_id: row.kullanici_id, unvan_id: title.id, acilma_nedeni: reason })
      logRows.push({ kullanici_id: row.kullanici_id, event_tipi: snapshot.eventType, seri_id: row.seri_id, payload: reason })
    }
  }

  const favoritedSeriesByUser = new Set()
  for (const row of readingList.filter(item => item.durum === 'okumak_istiyorum')) {
    const uniq = `${row.kullanici_id}:${row.seri_id}`
    if (favoritedSeriesByUser.has(uniq)) continue
    favoritedSeriesByUser.add(uniq)

    const seriesInfo = seriesById.get(row.seri_id)
    const characterGroup = normalizeText(seriesInfo?.character_group)
    const favoritesCountInGroup = favoriteCountsByUserGroup.get(`${row.kullanici_id}:${characterGroup}`) || 0
    const snapshot = buildSnapshot({
      eventType: EVENT.SERIES_FAVORITED,
      userId: row.kullanici_id,
      seriesId: row.seri_id,
      characterGroup,
      favoritesCountInGroup,
    })

    for (const rule of rules.filter(item => item.event_tipi === EVENT.SERIES_FAVORITED)) {
      const title = titleById.get(rule.unvan_id)
      if (!title) continue
      const unlockKey = `${row.kullanici_id}:${title.id}`
      if (existingUnlockSet.has(unlockKey)) continue
      if (!evaluateRule(rule, snapshot)) continue

      existingUnlockSet.add(unlockKey)
      const reason = buildUnlockReason(rule, snapshot)
      unlockRows.push({ kullanici_id: row.kullanici_id, unvan_id: title.id, acilma_nedeni: reason })
      logRows.push({ kullanici_id: row.kullanici_id, event_tipi: snapshot.eventType, seri_id: row.seri_id, payload: reason })
    }
  }

  if (unlockRows.length) {
    const { error } = await supabase
      .from('kullanici_unvanlari')
      .upsert(unlockRows, { onConflict: 'kullanici_id,unvan_id' })
    if (error) throw error
  }

  if (logRows.length) {
    const { error } = await supabase
      .from('unvan_olay_loglari')
      .insert(logRows)
    if (error) throw error
  }

  const unlockSummary = {}
  for (const row of unlockRows) {
    unlockSummary[row.kullanici_id] = (unlockSummary[row.kullanici_id] || 0) + 1
  }

  console.log(JSON.stringify({
    profiles: profiles.length,
    readsBackfilled: readRows.length,
    progressRows: progressRows.length,
    unlockedTitles: unlockRows.length,
    usersWithUnlocks: Object.keys(unlockSummary).length,
    unlockSummary,
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
