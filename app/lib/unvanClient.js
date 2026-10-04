import { supabase } from './supabase'

export async function syncTitles() {
  const { data, error } = await supabase.rpc('unvan_v2_senkron')
  if (error) throw error
  return Array.isArray(data) ? data : []
}

export async function trackIssueReadAndUnlock({ userId, bolumId, completionRatio = 1, readingTimeSec = 20 }) {
  if (!userId || !bolumId || completionRatio < 0.7 || readingTimeSec < 15) return []
  const { data, error } = await supabase.rpc('unvan_v2_okuma', {
    p_bolum: bolumId,
    p_oran: Math.min(1, Number(completionRatio)),
    p_sure: Math.min(86400, Math.floor(Number(readingTimeSec))),
  })
  if (error) {
    throw error
  }
  return Array.isArray(data) ? data : []
}

// Eski cagri noktalarinin uyumlulugu: etkilesimler artik unvan kazandirmaz.
export async function trackSeriesRatingAndUnlock() { return [] }
export async function trackSeriesCommentAndUnlock() { return [] }
export async function trackIssueCommentAndUnlock() { return [] }
export async function trackIssueDownloadAndUnlock() { return [] }
export async function trackSeriesFavoriteAndUnlock() { return [] }
