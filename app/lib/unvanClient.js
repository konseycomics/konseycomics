import { supabase } from './supabase'
import {
  UNVAN_EVENT,
  buildRuleSnapshot,
  evaluateRule,
  filterRulesByEvent,
  getUnlockedTitlePayload,
} from './unvanEngine'

function getTitleFromRule(rule) {
  if (!rule) return null
  if (Array.isArray(rule.unvan_tanimlari)) return rule.unvan_tanimlari[0] || null
  return rule.unvan_tanimlari || null
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

async function fetchSeriesInfo(seriId) {
  const { data, error } = await supabase
    .from('seriler')
    .select('id, baslik, character_group')
    .eq('id', seriId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function fetchTotalIssueCount(seriId) {
  const { count, error } = await supabase
    .from('bolumler')
    .select('id', { count: 'exact', head: true })
    .eq('seri_id', seriId)

  if (error) throw error
  return Number(count || 0)
}

async function fetchReadIssueCount(userId, seriId) {
  const { count, error } = await supabase
    .from('kullanici_bolum_okumalari')
    .select('id', { count: 'exact', head: true })
    .eq('kullanici_id', userId)
    .eq('seri_id', seriId)
    .gte('completion_ratio', 0.7)

  if (error) throw error
  return Number(count || 0)
}

async function fetchCompletedSeriesCountByCharacterGroup(userId, characterGroup) {
  if (!characterGroup) return 0
  const { data, error } = await supabase
    .from('kullanici_seri_ilerleme')
    .select('seri_id, seriler(character_group)')
    .eq('kullanici_id', userId)
    .eq('tamamlandi', true)

  if (error) throw error

  return (data || []).filter(item => {
    const group = Array.isArray(item.seriler) ? item.seriler[0]?.character_group : item.seriler?.character_group
    return normalizeText(group) === normalizeText(characterGroup)
  }).length
}

async function fetchRatingsCountByCharacterGroup(userId, characterGroup) {
  if (!characterGroup) return 0
  const { data, error } = await supabase
    .from('seri_puanlari')
    .select('seri_id, seriler(character_group)')
    .eq('kullanici_id', userId)

  if (error) throw error

  return (data || []).filter(item => {
    const group = Array.isArray(item.seriler) ? item.seriler[0]?.character_group : item.seriler?.character_group
    return normalizeText(group) === normalizeText(characterGroup)
  }).length
}

async function fetchFavoriteCountByCharacterGroup(userId, characterGroup) {
  if (!characterGroup) return 0
  const { data, error } = await supabase
    .from('okuma_listesi')
    .select('seri_id, seriler(character_group)')
    .eq('kullanici_id', userId)
    .eq('durum', 'okumak_istiyorum')

  if (error) throw error

  return (data || []).filter(item => {
    const group = Array.isArray(item.seriler) ? item.seriler[0]?.character_group : item.seriler?.character_group
    return normalizeText(group) === normalizeText(characterGroup)
  }).length
}

async function fetchRulesForEvent(eventType) {
  const { data, error } = await supabase
    .from('unvan_kurallari')
    .select('id, unvan_id, event_tipi, kural_tipi, kural_config, aktif, oncelik, unvan_tanimlari(id, kod, isim, aciklama, nadirlik)')
    .eq('event_tipi', eventType)
    .eq('aktif', true)
    .order('oncelik', { ascending: true })

  if (error) throw error
  return data || []
}

async function fetchExistingUnlockedTitleIds(userId, titleIds) {
  if (!titleIds.length) return new Set()
  const { data, error } = await supabase
    .from('kullanici_unvanlari')
    .select('unvan_id')
    .eq('kullanici_id', userId)
    .in('unvan_id', titleIds)

  if (error) throw error
  return new Set((data || []).map(item => item.unvan_id))
}

async function unlockTitlesForSnapshot(snapshot) {
  const rules = await fetchRulesForEvent(snapshot.eventType)
  if (!rules.length) return []

  const titleIds = rules.map(rule => rule.unvan_id).filter(Boolean)
  const unlockedIds = await fetchExistingUnlockedTitleIds(snapshot.userId, titleIds)
  const unlockedPayloads = []

  for (const rule of filterRulesByEvent(rules, snapshot.eventType)) {
    const title = getTitleFromRule(rule)
    if (!title?.id || unlockedIds.has(title.id)) continue
    if (!evaluateRule(rule, snapshot)) continue

    const payload = getUnlockedTitlePayload({ title, rule, snapshot })
    const { error } = await supabase
      .from('kullanici_unvanlari')
      .insert({
        kullanici_id: snapshot.userId,
        unvan_id: title.id,
        acilma_nedeni: payload.reason,
      })

    if (!error) {
      unlockedIds.add(title.id)
      unlockedPayloads.push(payload)
      await supabase.from('unvan_olay_loglari').insert({
        kullanici_id: snapshot.userId,
        event_tipi: snapshot.eventType,
        seri_id: snapshot.seriesId || null,
        bolum_id: snapshot.bolumId || null,
        payload: payload.reason,
      })
    }
  }

  return unlockedPayloads
}

export async function trackIssueReadAndUnlock({
  userId,
  seriId,
  bolumId,
  completionRatio = 1,
  readingTimeSec = 20,
}) {
  if (!userId || !seriId || !bolumId) return []
  if (Number(completionRatio) < 0.7) return []
  if (Number(readingTimeSec) < 15) return []

  try {
    const [seriInfo, toplamBolumSayisi] = await Promise.all([
      fetchSeriesInfo(seriId),
      fetchTotalIssueCount(seriId),
    ])

    if (!seriInfo) return []

    await supabase.from('kullanici_bolum_okumalari').upsert(
      {
        kullanici_id: userId,
        bolum_id: bolumId,
        seri_id: seriId,
        completion_ratio: completionRatio,
        okuma_suresi_sec: readingTimeSec,
        okundu_at: new Date().toISOString(),
      },
      { onConflict: 'kullanici_id,bolum_id' }
    )

    const okunanBolumSayisi = await fetchReadIssueCount(userId, seriId)
    const ilerlemeYuzdesi = toplamBolumSayisi > 0 ? Math.min(100, Number(((okunanBolumSayisi / toplamBolumSayisi) * 100).toFixed(2))) : 0
    const tamamlandi = toplamBolumSayisi > 0 && okunanBolumSayisi >= toplamBolumSayisi

    await supabase.from('kullanici_seri_ilerleme').upsert(
      {
        kullanici_id: userId,
        seri_id: seriId,
        okunan_bolum_sayisi: okunanBolumSayisi,
        toplam_bolum_sayisi: toplamBolumSayisi,
        ilerleme_yuzdesi: ilerlemeYuzdesi,
        tamamlandi,
        ilk_okuma_at: new Date().toISOString(),
        son_okuma_at: new Date().toISOString(),
      },
      { onConflict: 'kullanici_id,seri_id' }
    )

    const completedSeriesCount = await fetchCompletedSeriesCountByCharacterGroup(userId, seriInfo.character_group)

    const progressSnapshot = buildRuleSnapshot({
      eventType: UNVAN_EVENT.ISSUE_READ_COMPLETED,
      userId,
      seriesId: seriId,
      bolumId,
      characterGroup: seriInfo.character_group,
      progressPercent: ilerlemeYuzdesi,
      isCompleted: tamamlandi,
      completedSeriesCount,
      completionRatio,
      readingTimeSec,
      readIssueCountInSeries: okunanBolumSayisi,
    })

    const issueReadUnlocked = await unlockTitlesForSnapshot(progressSnapshot)

    const seriesProgressSnapshot = buildRuleSnapshot({
      eventType: UNVAN_EVENT.SERIES_PROGRESS_UPDATED,
      userId,
      seriesId: seriId,
      bolumId,
      characterGroup: seriInfo.character_group,
      progressPercent: ilerlemeYuzdesi,
      isCompleted: tamamlandi,
      completedSeriesCount,
      completionRatio,
      readingTimeSec,
      readIssueCountInSeries: okunanBolumSayisi,
    })

    const unlocked = await unlockTitlesForSnapshot(seriesProgressSnapshot)

    if (tamamlandi) {
      const completedSnapshot = buildRuleSnapshot({
        eventType: UNVAN_EVENT.SERIES_COMPLETED,
        userId,
        seriesId: seriId,
        bolumId,
        characterGroup: seriInfo.character_group,
        progressPercent: ilerlemeYuzdesi,
        isCompleted: true,
        completedSeriesCount,
        completionRatio,
        readingTimeSec,
        readIssueCountInSeries: okunanBolumSayisi,
      })
      const completedUnlocked = await unlockTitlesForSnapshot(completedSnapshot)
      return [...issueReadUnlocked, ...unlocked, ...completedUnlocked]
    }

    return [...issueReadUnlocked, ...unlocked]
  } catch (error) {
    console.warn('Unvan issue tracking atlandi:', error?.message || error)
    return []
  }
}

export async function trackSeriesRatingAndUnlock({ userId, seriId }) {
  if (!userId || !seriId) return []

  try {
    const seriInfo = await fetchSeriesInfo(seriId)
    if (!seriInfo?.character_group) return []

    const ratingsCountInGroup = await fetchRatingsCountByCharacterGroup(userId, seriInfo.character_group)
    const snapshot = buildRuleSnapshot({
      eventType: UNVAN_EVENT.SERIES_RATED,
      userId,
      seriesId: seriId,
      characterGroup: seriInfo.character_group,
      ratingsCountInGroup,
    })

    return unlockTitlesForSnapshot(snapshot)
  } catch (error) {
    console.warn('Unvan rating tracking atlandi:', error?.message || error)
    return []
  }
}

export async function trackSeriesCommentAndUnlock({ userId, seriId }) {
  if (!userId || !seriId) return []

  try {
    const seriInfo = await fetchSeriesInfo(seriId)
    const snapshot = buildRuleSnapshot({
      eventType: UNVAN_EVENT.SERIES_COMMENT_POSTED,
      userId,
      seriesId: seriId,
      characterGroup: seriInfo?.character_group || null,
    })

    return unlockTitlesForSnapshot(snapshot)
  } catch (error) {
    console.warn('Unvan series comment tracking atlandi:', error?.message || error)
    return []
  }
}

export async function trackIssueCommentAndUnlock({ userId, seriId, bolumId }) {
  if (!userId || !seriId || !bolumId) return []

  try {
    const seriInfo = await fetchSeriesInfo(seriId)
    const snapshot = buildRuleSnapshot({
      eventType: UNVAN_EVENT.ISSUE_COMMENT_POSTED,
      userId,
      seriesId: seriId,
      bolumId,
      characterGroup: seriInfo?.character_group || null,
    })

    return unlockTitlesForSnapshot(snapshot)
  } catch (error) {
    console.warn('Unvan issue comment tracking atlandi:', error?.message || error)
    return []
  }
}

export async function trackIssueDownloadAndUnlock({ userId, seriId, bolumId }) {
  if (!userId || !seriId || !bolumId) return []

  try {
    const seriInfo = await fetchSeriesInfo(seriId)
    const snapshot = buildRuleSnapshot({
      eventType: UNVAN_EVENT.ISSUE_DOWNLOADED,
      userId,
      seriesId: seriId,
      bolumId,
      characterGroup: seriInfo?.character_group || null,
    })

    return unlockTitlesForSnapshot(snapshot)
  } catch (error) {
    console.warn('Unvan issue download tracking atlandi:', error?.message || error)
    return []
  }
}

export async function trackSeriesFavoriteAndUnlock({ userId, seriId }) {
  if (!userId || !seriId) return []

  try {
    const seriInfo = await fetchSeriesInfo(seriId)
    if (!seriInfo?.character_group) return []

    const favoritesCountInGroup = await fetchFavoriteCountByCharacterGroup(userId, seriInfo.character_group)
    const snapshot = buildRuleSnapshot({
      eventType: UNVAN_EVENT.SERIES_FAVORITED,
      userId,
      seriesId: seriId,
      characterGroup: seriInfo.character_group,
      favoritesCountInGroup,
    })

    return unlockTitlesForSnapshot(snapshot)
  } catch (error) {
    console.warn('Unvan favorite tracking atlandi:', error?.message || error)
    return []
  }
}
