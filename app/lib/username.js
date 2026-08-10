export function slugifyUsername(value) {
  const base = String(value || '')
    .toLocaleLowerCase('tr-TR')
    .trim()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (base.length >= 3) return base.slice(0, 24)
  if (base.length > 0) return `${base}${'_'.repeat(3 - base.length)}`
  return ''
}

export function getEmailUsername(email) {
  const localPart = String(email || '').split('@')[0]?.split('+')[0] || ''
  return slugifyUsername(localPart)
}

export function getPreferredUsername(user, explicitUsername, { allowFallback = true } = {}) {
  const preferred =
    slugifyUsername(explicitUsername) ||
    slugifyUsername(user?.user_metadata?.kullanici_adi) ||
    slugifyUsername(user?.user_metadata?.username) ||
    slugifyUsername(user?.raw_user_meta_data?.kullanici_adi) ||
    slugifyUsername(user?.raw_user_meta_data?.username) ||
    getEmailUsername(user?.email)

  if (preferred) return preferred
  if (!allowFallback) return ''

  return `uye_${String(user?.id || '').replace(/-/g, '').slice(0, 8)}`
}

export function isGeneratedUsername(value) {
  return /^uye_[a-f0-9]{8}$/i.test(String(value || ''))
}

export function getUsernameCandidates(preferredUsername, userId) {
  const base = slugifyUsername(preferredUsername)
  if (!base) return []

  const idPart = String(userId || '').replace(/-/g, '').toLowerCase()
  const suffixes = ['', idPart.slice(0, 4), idPart.slice(0, 8)].filter((value, index) => index === 0 || value)

  return [...new Set(suffixes.map((suffix) => {
    if (!suffix) return base
    const prefix = base.slice(0, 23 - suffix.length).replace(/_+$/g, '')
    return `${prefix}_${suffix}`
  }))]
}
