import { readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { parseEnv } from 'node:util'
import { validatePreviewBuildSettings } from '../cloudflare/free-preview/build-settings.mjs'
import { checkpointStaticAssets, readAssetRelease } from '../cloudflare/free-preview/asset-releases.mjs'

const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
let localEnv = {}
try {
  localEnv = parseEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
validatePreviewBuildSettings(config.vars || {}, { ...localEnv, ...process.env })
const releaseFile = new URL('../.dev.vars.asset-release.json', import.meta.url)
await checkpointStaticAssets({ clientDir: 'dist/client', historyDir: '.cloudflare-static-history', release: readAssetRelease(releaseFile) })
await writeFile(releaseFile, JSON.stringify({ id: randomBytes(8).toString('hex'), createdAt: new Date().toISOString() }), { mode: 0o600 })
console.log('Public preview build settings validated; values are not logged.')
