const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v26.0'
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`

function credentials() {
  const userId = process.env.INSTAGRAM_USER_ID
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!userId || !accessToken) throw new Error('Instagram bağlantısı henüz yapılandırılmadı.')
  return { userId, accessToken }
}

async function graphRequest(path, params = {}, method = 'GET') {
  const { accessToken } = credentials()
  const body = new URLSearchParams({ ...params, access_token: accessToken })
  const url = method === 'GET' ? `${GRAPH_BASE}${path}?${body}` : `${GRAPH_BASE}${path}`
  const response = await fetch(url, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
    body: method === 'POST' ? body : undefined,
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `Instagram API hatası (${response.status}).`)
  return payload
}

async function containerHazirliginiBekle(containerId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await graphRequest(`/${containerId}`, { fields: 'status_code,status' })
    if (result.status_code === 'FINISHED') return
    if (['ERROR', 'EXPIRED'].includes(result.status_code)) throw new Error(result.status || `Instagram medyası ${result.status_code}.`)
    await new Promise(resolve => setTimeout(resolve, 2500))
  }
  throw new Error('Instagram medyası hazırlanırken zaman aşımı oluştu.')
}

export async function instagramHesabiniGetir() {
  const { userId } = credentials()
  return graphRequest(`/${userId}`, { fields: 'id,user_id,username,account_type,profile_picture_url' })
}

export async function instagramGonderisiYayinla({ gorseller, aciklama }) {
  const { userId } = credentials()
  if (!Array.isArray(gorseller) || gorseller.length < 1 || gorseller.length > 10) {
    throw new Error('Instagram gönderisi 1-10 görsel içermeli.')
  }

  let creationId
  if (gorseller.length === 1) {
    const container = await graphRequest(`/${userId}/media`, {
      image_url: gorseller[0],
      caption: aciklama || '',
    }, 'POST')
    creationId = container.id
  } else {
    const children = []
    for (const imageUrl of gorseller) {
      const child = await graphRequest(`/${userId}/media`, {
        image_url: imageUrl,
        is_carousel_item: 'true',
      }, 'POST')
      children.push(child.id)
    }
    const container = await graphRequest(`/${userId}/media`, {
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption: aciklama || '',
    }, 'POST')
    creationId = container.id
  }

  await containerHazirliginiBekle(creationId)
  const published = await graphRequest(`/${userId}/media_publish`, { creation_id: creationId }, 'POST')
  const details = await graphRequest(`/${published.id}`, { fields: 'id,permalink,timestamp' })
  return { mediaId: published.id, permalink: details.permalink || null }
}
