'use client'

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

export function getOturumId() {
  try {
    let id = sessionStorage.getItem('oturum_id')
    if (!id) {
      id = randomId('s')
      sessionStorage.setItem('oturum_id', id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

export function getZiyaretciId() {
  try {
    let id = localStorage.getItem('ziyaretci_id')
    if (!id) {
      id = randomId('v')
      localStorage.setItem('ziyaretci_id', id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

export function shouldTrackContentView(type, contentId, dedupWindowMs = 24 * 60 * 60 * 1000) {
  try {
    if (!type || !contentId) return false

    const ziyaretciId = getZiyaretciId()
    const key = `goruntuleme:${type}:${contentId}:${ziyaretciId}`
    const now = Date.now()
    const sonKayit = Number(localStorage.getItem(key) || 0)

    if (sonKayit && now - sonKayit < dedupWindowMs) {
      return false
    }

    localStorage.setItem(key, String(now))
    return true
  } catch {
    return true
  }
}
