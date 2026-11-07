import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'))
if (config.vars.KONSEY_FREE_MEDIA !== '1') {
  console.log('Delayed free media publication is disabled; uploads use the existing R2 bucket.')
  process.exit(0)
}

const base = 'https://konseycomics-free-preview.konseycomics.workers.dev'
const objects = JSON.parse(await readFile('cloudflare/media-static/archive-manifest.json', 'utf8')).objects
const full = process.argv.includes('--full')
const selected = full ? objects : objects.filter((_, index) => index % Math.max(1, Math.floor(objects.length / 12)) === 0)
let cursor = 0
let checked = 0
let totalBytes = 0
async function worker() {
  while (cursor < selected.length) {
    const object = selected[cursor++]
    const url = `${base}/${object.key.split('/').map(encodeURIComponent).join('/')}`
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(60000) })
    assert.equal(response.status, 200, `Missing static media: ${object.key}`)
    assert.match(response.headers.get('content-type') || '', /^image\//, `Incorrect MIME: ${object.key}`)
    const bytes = new Uint8Array(await response.arrayBuffer())
    assert.equal(bytes.length, object.size, `Incorrect size: ${object.key}`)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), object.sha256, `Incorrect hash: ${object.key}`)
    totalBytes += bytes.length
    checked++
    if (full && checked % 250 === 0) console.log(`Verified remote images ${checked}/${selected.length}`)
  }
}
await Promise.all(Array.from({ length: 6 }, () => worker()))
const result = { checkedAt: new Date().toISOString(), fullArchive: full, objects: checked, totalBytes, source: base, matched: true }
if (full) await writeFile('.media-migration/r2-static-archive/remote-verification.json', JSON.stringify(result, null, 2), { mode: 0o600 })
console.log(JSON.stringify(result))
