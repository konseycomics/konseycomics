import { createHash } from 'node:crypto'
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { appIsrCacheKey } from 'vinext/internal/server/isr-cache'
import config from '../next.config.mjs'
import { checkpointStaticAssets, readAssetRelease, restoreStaticAssets } from '../cloudflare/free-preview/asset-releases.mjs'
import { getContentRevision } from '../cloudflare/free-preview/content-revision.mjs'

const manifest = JSON.parse(await readFile('dist/server/vinext-prerender.json', 'utf8'))
const cache = JSON.parse(await readFile('dist/client/_vinext/static-cache/index.json', 'utf8'))
const routes = {}
for (const route of manifest.routes) {
  if (route.status !== 'rendered' || route.router !== 'app') continue
  const path = route.path || route.route
  if (!(path === '/' || path === '/seriler' || path === '/yerli-eserler' || path === '/forum' || path.startsWith('/forum/') || path.startsWith('/seri/') || path.startsWith('/oku/'))) continue
  const id = createHash('sha256').update(appIsrCacheKey(path, 'html', manifest.buildId)).digest('hex')
  const entry = cache[id]
  if (!entry || entry.kind !== 'html') throw new Error(`Missing HTML snapshot: ${path}`)
  routes[path] = { asset: `/_vinext/static-cache/${id}.html`, headers: entry.headers, status: entry.status || 200 }
}
const headers = Object.fromEntries((await config.headers())[0].headers.map(({ key, value }) => [key, value]))
await copyFile('app/icon.png', 'dist/client/icon.png')
const release = readAssetRelease(new URL('../.next/cache/konsey-asset-release.json', import.meta.url))
if (release?.contentRevision !== null && release?.contentRevision !== undefined) {
  const env = JSON.parse(await readFile('.dev.vars.build-public.json', 'utf8'))
  if (await getContentRevision(env) !== release.contentRevision) throw new Error('Public content changed during prerender; retry instead of deploying inconsistent snapshots.')
}
await writeFile('dist/client/_vinext/static-cache/public-pages.json', JSON.stringify({ routes, headers, buildId: manifest.buildId, contentRevision: release?.contentRevision ?? null, sourceCommit: process.env.GITHUB_SHA || null }))
console.log(`Prepared direct HTML delivery for ${Object.keys(routes).length} public pages`)
const retained = await restoreStaticAssets({ clientDir: 'dist/client', historyDir: '.next/cache/konsey-static-history' })
console.log(`Retained static files from ${retained} previous preview builds`)
await checkpointStaticAssets({ clientDir: 'dist/client', historyDir: '.next/cache/konsey-static-history', release: readAssetRelease(new URL('../.next/cache/konsey-asset-release.json', import.meta.url)) })
