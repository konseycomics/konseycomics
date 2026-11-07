import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { parseEnv } from 'node:util'
import { publicPreviewSettings, validatePreviewBuildSettings } from '../cloudflare/free-preview/build-settings.mjs'
import { checkpointStaticAssets, readAssetRelease } from '../cloudflare/free-preview/asset-releases.mjs'
import { getContentRevision } from '../cloudflare/free-preview/content-revision.mjs'

const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
let localEnv = {}
try {
  localEnv = parseEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const buildEnv = { ...localEnv, ...process.env }
validatePreviewBuildSettings(config.vars || {}, buildEnv)
await writeFile(new URL('../.dev.vars.build-public.json', import.meta.url), JSON.stringify(publicPreviewSettings(buildEnv)), { mode: 0o600 })
await mkdir('.next/cache', { recursive: true })
const releaseFile = new URL('../.next/cache/konsey-asset-release.json', import.meta.url)
const cachedRelease = readAssetRelease(releaseFile)
const priorRelease = cachedRelease || readAssetRelease(new URL('../.dev.vars.asset-release.json', import.meta.url))
// Migrate local history; Cloudflare Builds retains the supported Next.js cache directory.
if (!cachedRelease) {
  try { await cp('.cloudflare-static-history', '.next/cache/konsey-static-history', { recursive: true, force: false, preserveTimestamps: true }) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
}
await checkpointStaticAssets({ clientDir: 'dist/client', historyDir: '.next/cache/konsey-static-history', release: priorRelease })
const contentRevision = config.vars.KONSEY_PREVIEW_REBUILD === '1' ? await getContentRevision(buildEnv) : null
await writeFile(releaseFile, JSON.stringify({ id: randomBytes(8).toString('hex'), createdAt: new Date().toISOString(), contentRevision }), { mode: 0o600 })
console.log('Public preview build settings validated; values are not logged.')
