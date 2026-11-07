import { createHash, createHmac } from 'node:crypto'
import { mkdir, readFile, writeFile, stat, statfs, rename } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { XMLParser } from 'fast-xml-parser'

const hash = value => createHash('sha256').update(value).digest('hex')
const hmac = (key, value) => createHmac('sha256', key).update(value).digest()
const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

export function safeAssetPath(root, key) {
  if (!key || key.startsWith('/') || key.includes('\\') || /[\x00-\x1f]/.test(key) || key.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Unsafe object path')
  const target = path.resolve(root, key)
  if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('Unsafe object path')
  return target
}

export function validateStaticInventory(objects) {
  if (objects.length > 19000) throw new Error('Static file safety limit exceeded')
  const seen = new Set()
  for (const object of objects) {
    safeAssetPath('/archive', object.key)
    if (seen.has(object.key)) throw new Error('Duplicate object key')
    seen.add(object.key)
    if (!Number.isSafeInteger(object.size) || object.size < 0 || object.size > 25 * 1024 * 1024) throw new Error('Object exceeds static asset size limit')
    if (!/\.(webp|png|jpe?g|gif|avif|ico)$/i.test(object.key)) throw new Error('Non-image object requires manual review')
  }
  return objects.reduce((sum, item) => sum + item.size, 0)
}

export function verifyObjectBytes(data, item) {
  if (data.length !== item.size) throw new Error('Backup size mismatch')
  const etag = String(item.etag || '').replaceAll('&quot;', '').replaceAll('"', '')
  if (/^[a-f0-9]{32}$/i.test(etag) && createHash('md5').update(data).digest('hex') !== etag.toLowerCase()) throw new Error('Backup checksum mismatch')
}

function config() {
  const names = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']
  for (const name of names) if (!process.env[name]) throw new Error(`Missing ${name}`)
  if (process.env.R2_ACCOUNT_ID !== '8494c13b77031af3f835c47c1fca6611' || process.env.R2_BUCKET !== 'konseycomics-media') throw new Error('Unexpected source bucket')
  return { account: process.env.R2_ACCOUNT_ID, access: process.env.R2_ACCESS_KEY_ID, secret: process.env.R2_SECRET_ACCESS_KEY, bucket: process.env.R2_BUCKET }
}

// This client deliberately implements GET only: inventory and backup cannot mutate R2.
async function getObjectOrList(config, key, params = {}) {
  const host = `${config.account}.r2.cloudflarestorage.com`
  const uri = `/${config.bucket}${key === null ? '' : '/' + key.split('/').map(encode).join('/')}`
  const query = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${encode(k)}=${encode(v)}`).join('&')
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const scope = `${date.slice(0, 8)}/auto/s3/aws4_request`
  const digest = hash('')
  const canonical = ['GET', uri, query, `host:${host}\nx-amz-content-sha256:${digest}\nx-amz-date:${date}\n`, 'host;x-amz-content-sha256;x-amz-date', digest].join('\n')
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${config.secret}`, date.slice(0, 8)), 'auto'), 's3'), 'aws4_request')
  const signature = createHmac('sha256', signingKey).update(['AWS4-HMAC-SHA256', date, scope, hash(canonical)].join('\n')).digest('hex')
  const response = await fetch(`https://${host}${uri}${query ? '?' + query : ''}`, {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(60000),
    headers: { 'x-amz-date': date, 'x-amz-content-sha256': digest, Authorization: `AWS4-HMAC-SHA256 Credential=${config.access}/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}` },
  })
  if (!response.ok) { await response.body?.cancel(); throw new Error(`R2 read failed: HTTP ${response.status}`) }
  return response
}

async function inventory(config) {
  const parser = new XMLParser({ parseTagValue: false, processEntities: false, isArray: tag => tag === 'Contents' })
  const objects = []
  const tokens = new Set()
  let token
  do {
    const response = await getObjectOrList(config, null, { 'list-type': '2', 'encoding-type': 'url', 'max-keys': '1000', ...(token ? { 'continuation-token': token } : {}) })
    const result = parser.parse(await response.text()).ListBucketResult
    if (!result || result.Name !== config.bucket) throw new Error('Unexpected inventory response')
    for (const item of result.Contents || []) objects.push({ key: decodeURIComponent(item.Key), size: Number(item.Size), etag: item.ETag, modified: item.LastModified })
    token = result.IsTruncated === 'true' ? result.NextContinuationToken : null
    if (token && tokens.has(token)) throw new Error('Repeated inventory cursor')
    if (token) tokens.add(token)
    if (objects.length > 19000) throw new Error('Static file safety limit exceeded')
  } while (token)
  return objects
}

async function main() {
  const mode = process.argv[2]
  if (!['inventory', 'backup', 'verify'].includes(mode)) throw new Error('Use inventory, backup or verify; no mutation commands exist')
  const source = config()
  const root = path.resolve(process.argv[3] || '.media-migration/r2-static-archive')
  await mkdir(root, { recursive: true, mode: 0o700 })
  const manifestPath = path.join(root, 'inventory.json')
  const objects = await inventory(source)
  const totalBytes = validateStaticInventory(objects)
  const manifest = { createdAt: new Date().toISOString(), bucket: source.bucket, totalBytes, objects }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 })
  console.log(JSON.stringify({ objects: objects.length, totalBytes, staticLimitsPass: true }))
  if (mode === 'inventory') return
  const filesRoot = path.join(root, 'files')
  await mkdir(filesRoot, { recursive: true, mode: 0o700 })
  if (mode === 'verify') {
    const saved = JSON.parse(await readFile(path.join(root, 'checksums.json'), 'utf8'))
    const checksums = new Map(saved.objects.map(item => [item.key, item.sha256]))
    if (checksums.size !== objects.length) throw new Error('Backup inventory is incomplete')
    for (const item of objects) {
      const data = await readFile(safeAssetPath(filesRoot, item.key))
      verifyObjectBytes(data, item)
      if (hash(data) !== checksums.get(item.key)) throw new Error('Backup SHA-256 mismatch')
    }
    console.log(`Verified ${objects.length} local files against source size, ETag and saved SHA-256. No changes made.`)
    return
  }
  const space = await statfs(root)
  if (space.bavail * space.bsize < totalBytes + 1024 ** 3) throw new Error('Insufficient free disk space for safe backup')
  const checksums = new Array(objects.length)
  let cursor = 0
  let completed = 0
  async function backupWorker() {
  while (cursor < objects.length) {
    const index = cursor++
    const item = objects[index]
    const target = safeAssetPath(filesRoot, item.key)
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
    let data
    try { if ((await stat(target)).size === item.size) data = await readFile(target) } catch {}
    if (!data) {
      const response = await getObjectOrList(source, item.key)
      data = Buffer.from(await response.arrayBuffer())
      if (data.length !== item.size) throw new Error('Object size changed during backup; retry inventory')
      const temp = `${target}.partial`
      await writeFile(temp, data, { mode: 0o600 })
      await rename(temp, target)
    }
    verifyObjectBytes(data, item)
    checksums[index] = { key: item.key, size: data.length, sha256: hash(data) }
    completed += 1
    if (completed % 100 === 0) console.log(`Backed up ${completed}/${objects.length}`)
  }
  }
  await Promise.all(Array.from({ length: 4 }, () => backupWorker()))
  const after = await inventory(source)
  if (JSON.stringify(after) !== JSON.stringify(objects)) throw new Error('Source changed during backup; retry before migration')
  await writeFile(path.join(root, 'checksums.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), objects: checksums }, null, 2), { mode: 0o600 })
  console.log(`Backup complete: ${checksums.length} files; source unchanged. No R2 objects deleted.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
