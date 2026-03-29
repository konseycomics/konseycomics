export const UNVAN_EVENT = {
  ISSUE_READ_COMPLETED: 'ISSUE_READ_COMPLETED',
  SERIES_PROGRESS_UPDATED: 'SERIES_PROGRESS_UPDATED',
  SERIES_COMPLETED: 'SERIES_COMPLETED',
  SERIES_RATED: 'SERIES_RATED',
  SERIES_FAVORITED: 'SERIES_FAVORITED',
}

export const UNVAN_RULE = {
  SERIES_PROGRESS: 'series_progress',
  SERIES_COMPLETED: 'series_completed',
  CHARACTER_SERIES_COMPLETED_COUNT: 'character_series_completed_count',
  RATE_COUNT_IN_GROUP: 'rate_count_in_group',
  FAVORITE_COUNT_IN_GROUP: 'favorite_count_in_group',
}

function safeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export function buildRuleSnapshot({
  eventType,
  userId,
  seriesId,
  bolumId = null,
  characterGroup = null,
  progressPercent = null,
  isCompleted = false,
  completedSeriesCount = null,
  ratingsCountInGroup = null,
  favoritesCountInGroup = null,
  completionRatio = null,
  readingTimeSec = null,
} = {}) {
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
    completionRatio: safeNumber(completionRatio, 0),
    readingTimeSec: safeNumber(readingTimeSec, 0),
  }
}

export function evaluateRule(rule, snapshot) {
  const config = rule?.kural_config || {}

  switch (rule?.kural_tipi) {
    case UNVAN_RULE.SERIES_PROGRESS:
      return evaluateSeriesProgressRule(config, snapshot)
    case UNVAN_RULE.SERIES_COMPLETED:
      return evaluateSeriesCompletedRule(config, snapshot)
    case UNVAN_RULE.CHARACTER_SERIES_COMPLETED_COUNT:
      return evaluateCharacterSeriesCompletedCountRule(config, snapshot)
    case UNVAN_RULE.RATE_COUNT_IN_GROUP:
      return evaluateRateCountInGroupRule(config, snapshot)
    case UNVAN_RULE.FAVORITE_COUNT_IN_GROUP:
      return evaluateFavoriteCountInGroupRule(config, snapshot)
    default:
      return false
  }
}

export function evaluateSeriesProgressRule(config, snapshot) {
  if (String(snapshot.seriesId) !== String(config.series_id)) return false
  return safeNumber(snapshot.progressPercent, 0) >= safeNumber(config.min_progress_percent, 100)
}

export function evaluateSeriesCompletedRule(config, snapshot) {
  if (String(snapshot.seriesId) !== String(config.series_id)) return false
  return snapshot.isCompleted === true
}

export function evaluateCharacterSeriesCompletedCountRule(config, snapshot) {
  if (normalizeText(snapshot.characterGroup) !== normalizeText(config.character_group)) return false
  return safeNumber(snapshot.completedSeriesCount, 0) >= safeNumber(config.min_completed_series, 1)
}

export function evaluateRateCountInGroupRule(config, snapshot) {
  if (normalizeText(snapshot.characterGroup) !== normalizeText(config.character_group)) return false
  return safeNumber(snapshot.ratingsCountInGroup, 0) >= safeNumber(config.min_ratings_count, 1)
}

export function evaluateFavoriteCountInGroupRule(config, snapshot) {
  if (normalizeText(snapshot.characterGroup) !== normalizeText(config.character_group)) return false
  return safeNumber(snapshot.favoritesCountInGroup, 0) >= safeNumber(config.min_favorites_count, 1)
}

export function buildUnlockReason(rule, snapshot) {
  return {
    trigger_event: snapshot.eventType,
    rule_type: rule?.kural_tipi || null,
    series_id: snapshot.seriesId || null,
    bolum_id: snapshot.bolumId || null,
    character_group: snapshot.characterGroup || null,
    progress_percent: snapshot.progressPercent || 0,
    completed_series_count: snapshot.completedSeriesCount || 0,
    ratings_count_in_group: snapshot.ratingsCountInGroup || 0,
    favorites_count_in_group: snapshot.favoritesCountInGroup || 0,
    completion_ratio: snapshot.completionRatio || 0,
    reading_time_sec: snapshot.readingTimeSec || 0,
    unlocked_at: new Date().toISOString(),
  }
}

export function filterRulesByEvent(rules, eventType) {
  return (rules || []).filter(rule => rule?.aktif !== false && rule?.event_tipi === eventType)
}

export function getUnlockedTitlePayload({ title, rule, snapshot }) {
  return {
    unvanId: title?.id,
    kod: title?.kod,
    isim: title?.isim,
    aciklama: title?.aciklama || '',
    nadirlik: title?.nadirlik || 'common',
    reason: buildUnlockReason(rule, snapshot),
  }
}
