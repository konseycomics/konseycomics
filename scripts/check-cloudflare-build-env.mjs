import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { validatePreviewBuildSettings } from '../cloudflare/free-preview/build-settings.mjs'

const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
let localEnv = {}
try {
  localEnv = parseEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
validatePreviewBuildSettings(config.vars || {}, { ...localEnv, ...process.env })
console.log('Public preview build settings validated; values are not logged.')
