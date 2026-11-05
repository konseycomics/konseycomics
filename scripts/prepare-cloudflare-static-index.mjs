import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { appIsrCacheKey } from 'vinext/internal/server/isr-cache'
import config from '../next.config.mjs'

const manifest = JSON.parse(await readFile('dist/server/vinext-prerender.json', 'utf8'))
const cache = JSON.parse(await readFile('dist/client/_vinext/static-cache/index.json', 'utf8'))
const routes = {}
for (const route of manifest.routes) {
  if (route.status !== 'rendered' || route.router !== 'app') continue
  const path = route.path || route.route
  if (!(path === '/' || path === '/seriler' || path === '/yerli-eserler' || path.startsWith('/seri/') || path.startsWith('/oku/'))) continue
  const id = createHash('sha256').update(appIsrCacheKey(path, 'html', manifest.buildId)).digest('hex')
  const entry = cache[id]
  if (!entry || entry.kind !== 'html') throw new Error(`Missing HTML snapshot: ${path}`)
  routes[path] = { asset: `/_vinext/static-cache/${id}.html`, headers: entry.headers, status: entry.status || 200 }
}
const headers = Object.fromEntries((await config.headers())[0].headers.map(({ key, value }) => [key, value]))
await writeFile('dist/client/_vinext/static-cache/public-pages.json', JSON.stringify({ routes, headers, buildId: manifest.buildId }))
console.log(`Prepared direct HTML delivery for ${Object.keys(routes).length} public pages`)
