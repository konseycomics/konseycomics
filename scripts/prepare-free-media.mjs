import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { safeAssetPath, validateStaticInventory } from './r2-static-archive.mjs'

const SOURCE = 'https://konseycomics-free-preview.konseycomics.workers.dev'
const MANIFEST = 'cloudflare/media-static/archive-manifest.json'
const hash = data => createHash('sha256').update(data).digest('hex')
const encodePath = key => key.split('/').map(encodeURIComponent).join('/')

export function mergeMediaInventory(archive, staged) {
  const media = new Map()
  for (const item of [...archive, ...staged]) {
    if (!/^[a-f0-9]{64}$/.test(item.sha256 || '')) throw new Error('Missing media checksum')
    const previous = media.get(item.key)
    if (previous && (previous.sha256 !== item.sha256 || previous.size !== item.size)) throw new Error('Conflicting immutable media key')
    media.set(item.key, item)
  }
  const result = [...media.values()].sort((a, b) => a.key.localeCompare(b.key))
  validateStaticInventory(result)
  return result
}

async function stagedObjects(env) {
  const objects = []
  for (let from = 0; ; from += 1000) {
    const query = new URLSearchParams({ select: 'object_key,size_bytes,sha256', order: 'object_key.asc', limit: '1000', offset: String(from) })
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/konsey_public_free_media?${query}`, {
      redirect: 'manual', signal: AbortSignal.timeout(30000), headers: { apikey: env.NEXT_PUBLIC_SUPABASE_KEY },
    })
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Free media inventory unavailable: HTTP ${response.status}`) }
    const rows = await response.json()
    if (!Array.isArray(rows)) throw new Error('Invalid free media inventory')
    for (const row of rows) {
      if (!/^free-uploads\/[a-f0-9-]{36}\.(webp|jpg)$/.test(row.object_key)) throw new Error('Unexpected staging key')
      objects.push({ key: row.object_key, size: Number(row.size_bytes), sha256: row.sha256, staged: true })
    }
    if (objects.length > 19000) throw new Error('Static media count limit exceeded')
    if (rows.length < 1000) return objects
  }
}

async function responseBytes(response, size) {
  const reader = response.body.getReader()
  const chunks = []
  let count = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      count += value.length
      if (count > size) { await reader.cancel(); throw new Error('Media body exceeds inventory size') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  if (count !== size) throw new Error('Media body size mismatch')
  return Buffer.concat(chunks)
}

async function main() {
  if (process.argv[2] === 'seed-manifest') {
    const backup = JSON.parse(await readFile('.media-migration/r2-static-archive/checksums.json', 'utf8'))
    const objects = mergeMediaInventory(backup.objects, [])
    await writeFile(MANIFEST, JSON.stringify({ version: 1, objects }, null, 2) + '\n')
    console.log(`Prepared public image manifest: ${objects.length} entries; no image bytes or secrets in Git.`)
    return
  }
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'))
  if (config.vars.KONSEY_FREE_MEDIA !== '1') { console.log('Free media publication not enabled; no media changes.'); return }
  const env = JSON.parse(await readFile('.dev.vars.build-public.json', 'utf8'))
  const archive = JSON.parse(await readFile(MANIFEST, 'utf8')).objects
  const objects = mergeMediaInventory(archive, await stagedObjects(env))
  const clientDir = 'dist/client'
  const existingFiles = await readdir(clientDir, { recursive: true, withFileTypes: true })
  if (existingFiles.filter(item => item.isFile()).length + objects.length > 19000) throw new Error('Combined site and media asset limit exceeded')
  let cursor = 0
  let completed = 0
  async function copyWorker() {
    while (cursor < objects.length) {
      const item = objects[cursor++]
      const target = safeAssetPath(clientDir, item.key)
      let data
      try {
        if ((await stat(target)).isFile()) {
          data = await readFile(target)
          if (data.length !== item.size || hash(data) !== item.sha256) throw new Error('Media key conflicts with an application asset')
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error }
      if (!data && !item.staged) {
        try { data = await readFile(safeAssetPath('.media-migration/r2-static-archive/files', item.key)) }
        catch (error) { if (error.code !== 'ENOENT') throw error }
      }
      if (!data) {
        let response = await fetch(`${SOURCE}/${encodePath(item.key)}`, { redirect: 'manual', signal: AbortSignal.timeout(60000) })
        if (response.status === 404 && item.staged) {
          await response.body?.cancel()
          response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/konsey-media-free/${encodePath(item.key)}`, { redirect: 'manual', signal: AbortSignal.timeout(60000) })
        }
        if (!response.ok) { await response.body?.cancel(); throw new Error(`Media source unavailable: HTTP ${response.status}`) }
        data = await responseBytes(response, item.size)
      }
      if (data.length !== item.size || hash(data) !== item.sha256) throw new Error('Source media checksum mismatch; refusing partial publication')
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, data)
      completed++
      if (completed % 250 === 0) console.log(`Prepared free media ${completed}/${objects.length}`)
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => copyWorker()))
  await mkdir(`${clientDir}/_konsey_media`, { recursive: true })
  await writeFile(`${clientDir}/_konsey_media/index.json`, JSON.stringify({ version: 1, objects }))
  console.log(`Prepared ${objects.length} verified images for free static delivery. No R2 fallback.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
