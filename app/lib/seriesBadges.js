export function isRecentlyAddedSeries(createdAt, hours = 72) {
  if (!createdAt) return false

  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return false

  return Date.now() - created.getTime() <= hours * 60 * 60 * 1000
}
