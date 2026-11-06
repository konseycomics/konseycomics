'use client'

// Full-document navigation avoids server rendering and speculative prefetch CPU.
export default function PreviewLink({ href, as, prefetch, replace, scroll, shallow, locale, onNavigate, ...props }) {
  const destination = as || href
  let url = destination
  if (destination && typeof destination === 'object') {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(destination.query || {})) {
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item != null) query.append(key, String(item))
      }
    }
    url = `${destination.pathname || ''}${query.size ? `?${query}` : ''}${destination.hash || ''}`
  }
  return <a {...props} href={url} />
}
