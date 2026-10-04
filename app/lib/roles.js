export const ROLES = [
  { value: 'kurucu', label: 'Kurucu' },
  { value: 'yonetici', label: 'Yönetici' },
  { value: 'cevirmeni', label: 'Çevirmen' },
  { value: 'balonlamaci', label: 'Balonlamacı' },
  { value: 'cizer', label: 'Çizer' },
  { value: 'okuyucu', label: 'Okuyucu' },
]
export const isFounder = role => role === 'kurucu'
export const canAccessPanel = role => role === 'kurucu' || role === 'yonetici'
export const isTeamRole = role => ROLES.some(item => item.value === role && role !== 'okuyucu')
export const roleLabel = role => ROLES.find(item => item.value === role)?.label || 'Okuyucu'
const MANAGER_SECTIONS = new Set(['yayin', 'seriler', 'bolumler', 'kategoriler', 'turler', 'yazarcizerler', 'forum', 'yorumlar', 'planet', 'unvanlar'])
export const canManageSection = (role, section) => isFounder(role) || (role === 'yonetici' && MANAGER_SECTIONS.has(section))
export const canUseStaffPrivileges = profile => canAccessPanel(profile?.rol) && !profile?.askiya_alindi
