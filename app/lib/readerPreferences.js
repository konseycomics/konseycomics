export const READER_PREFERENCES_KEY = 'konsey-reader-preferences-v1'

export function browserReaderStorage() {
  try { return window.localStorage }
  catch { return null }
}

export function loadReaderState(storage, chapterKey, total, initialPage = 1, initialMode = 'scroll') {
  const fallback = { page: Math.max(1, Math.min(total, initialPage)), mode: initialMode, spread: 'auto', offset: 0 }
  try {
    const preferences = JSON.parse(storage.getItem(READER_PREFERENCES_KEY) || '{}')
    const progress = chapterKey ? JSON.parse(storage.getItem(chapterKey) || '{}') : {}
    return {
      page: Number.isInteger(progress.page) ? Math.max(1, Math.min(total, progress.page)) : fallback.page,
      mode: ['scroll', 'flip'].includes(preferences.mode) ? preferences.mode : fallback.mode,
      spread: ['auto', 'single', 'double'].includes(preferences.spread) ? preferences.spread : 'auto',
      offset: Number.isFinite(progress.offset) ? Math.max(0, Math.min(1, progress.offset)) : 0
    }
  } catch { return fallback }
}

export function saveReaderState(storage, chapterKey, state) {
  try {
    storage.setItem(READER_PREFERENCES_KEY, JSON.stringify({ mode: state.mode, spread: state.spread }))
    if (chapterKey) storage.setItem(chapterKey, JSON.stringify({ page: state.page, offset: state.offset, updatedAt: Date.now() }))
  } catch { /* Browser storage may be disabled or full. */ }
}
