import { createClient } from '@supabase/supabase-js'
import { createHash, createHmac } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createWriteStream, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, '.media-migration')
const INVENTORY_PATH = path.join(OUT_DIR, 'inventory.json')
const DOWNLOAD_DIR = path.join(OUT_DIR, 'originals')
const OPTIMIZED_DIR = path.join(OUT_DIR, 'optimized')
const OPTIMIZED_MANIFEST_PATH = path.join(OUT_DIR, 'optimized-manifest.json')
const URL_MAP_PATH = path.join(OUT_DIR, 'url-map.json')
const SQL_PATH = path.join(OUT_DIR, 'replace-media-urls.sql')

const TABLES = [
  'seriler',
  'bolumler',
  'site_ayarlari',
  'public_profiller',
  'kategoriler',
  'turler',
  'ekip',
  'konsey_planet_yazilari',
  'topluluk_konulari',
]

function loadEnvFile(file = '.env.local') {
  if (!existsSync(file)) return
  const text = awaitableRead(file)
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}

function awaitableRead(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : ''
}

function getSupabaseClient() {
  loadEnvFile()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_KEY gerekli.')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isSupabaseStorageUrl(value) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return (
    typeof value === 'string' &&
    value.startsWith('http') &&
    value.includes('/storage/v1/object/public/') &&
    (!supabaseUrl || value.startsWith(supabaseUrl))
  )
}

function collectUrls(value, source, found = []) {
  if (!value) return found
  if (typeof value === 'string') {
    if (isSupabaseStorageUrl(value)) found.push({ url: value, source })
    return found
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUrls(item, `${source}[${index}]`, found))
    return found
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => collectUrls(item, `${source}.${key}`, found))
  }
  return found
}

function storageKeyFromUrl(url) {
  const parsed = new URL(url)
  const marker = '/storage/v1/object/public/'
  const index = parsed.pathname.indexOf(marker)
  if (index === -1) {
    const hash = createHash('sha1').update(url).digest('hex')
    return `unknown/${hash}`
  }
  return decodeURIComponent(parsed.pathname.slice(index + marker.length))
}

function safeLocalPathForUrl(url) {
  return path.join(DOWNLOAD_DIR, storageKeyFromUrl(url).replace(/^\/+/, ''))
}

function optimizedKeyForStorageKey(storageKey) {
  const parsed = path.parse(storageKey)
  return path.join(parsed.dir, `${parsed.name}.webp`)
}

function optimizeSettings(storageKey) {
  const bucket = storageKey.split('/')[0]
  const filename = path.basename(storageKey)
  if (bucket === 'avatarlar' && filename.startsWith('avatar-')) return { width: 512, quality: 78 }
  if (bucket === 'avatarlar' && filename.startsWith('banner-')) return { width: 1600, quality: 78 }
  if (bucket === 'bolum-kapaklari') return { width: 900, quality: 78 }
  if (bucket === 'site') return { width: 1920, quality: 80 }
  if (bucket === 'kapaklar' && filename.startsWith('sayfa-')) return { width: 1600, quality: 78 }
  if (bucket === 'kapaklar') return { width: 1100, quality: 80 }
  return { width: 1400, quality: 78 }
}

function hmac(key, value, encoding) {
  return createHmac('sha256', key).update(value).digest(encoding)
}

function hash(value, encoding = 'hex') {
  return createHash('sha256').update(value).digest(encoding)
}

function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp)
  const kRegion = hmac(kDate, regionName)
  const kService = hmac(kRegion, serviceName)
  return hmac(kService, 'aws4_request')
}

function r2Config() {
  loadEnvFile()
  const config = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicUrl: process.env.R2_PUBLIC_URL,
  }
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key)
  if (missing.length) {
    throw new Error(`R2 env eksik: ${missing.join(', ')}`)
  }
  return config
}

function buildR2Url(publicUrl, key) {
  return `${publicUrl.replace(/\/+$/, '')}/${key.split(path.sep).map(encodeURIComponent).join('/')}`
}

async function fetchAllRows(supabase, table) {
  const rows = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1)

    if (error) {
      console.warn(`Atlandi: ${table} (${error.message})`)
      return rows
    }
    rows.push(...(data || []))
    if (!data || data.length < pageSize) return rows
  }
}

async function buildInventory() {
  const supabase = getSupabaseClient()
  const byUrl = new Map()

  for (const table of TABLES) {
    const rows = await fetchAllRows(supabase, table)
    console.log(`${table}: ${rows.length} satir`)
    rows.forEach((row) => {
      const rowId = row.id || row.anahtar || row.slug || 'unknown'
      const matches = collectUrls(row, `${table}:${rowId}`)
      matches.forEach(({ url, source }) => {
        const current = byUrl.get(url) || {
          url,
          storageKey: storageKeyFromUrl(url),
          sources: [],
        }
        current.sources.push(source)
        byUrl.set(url, current)
      })
    })
  }

  const assets = [...byUrl.values()].sort((a, b) => a.storageKey.localeCompare(b.storageKey))
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(INVENTORY_PATH, JSON.stringify({ createdAt: new Date().toISOString(), assets }, null, 2))
  console.log(`\n${assets.length} benzersiz Supabase Storage URL bulundu.`)
  console.log(INVENTORY_PATH)
}

async function downloadInventory() {
  const inventory = JSON.parse(await readFile(INVENTORY_PATH, 'utf8'))
  let downloaded = 0
  let skipped = 0
  let failed = 0
  let bytes = 0

  for (const asset of inventory.assets) {
    const localPath = safeLocalPathForUrl(asset.url)
    if (existsSync(localPath)) {
      const info = await stat(localPath)
      bytes += info.size
      skipped += 1
      continue
    }
    await mkdir(path.dirname(localPath), { recursive: true })
    const res = await fetch(asset.url)
    if (!res.ok || !res.body) {
      console.warn(`Indirilemedi ${res.status}: ${asset.storageKey}`)
      failed += 1
      continue
    }
    await pipeline(res.body, createWriteStream(localPath))
    const info = await stat(localPath)
    bytes += info.size
    downloaded += 1
    if ((downloaded + skipped + failed) % 25 === 0) {
      console.log(`${downloaded} indirildi, ${skipped} zaten vardi, ${failed} hata`)
    }
  }

  console.log(`\nTamam: ${downloaded} indirildi, ${skipped} zaten vardi, ${failed} hata.`)
  console.log(`Toplam lokal orijinal boyut: ${(bytes / 1024 / 1024).toFixed(2)} MB`)
  console.log(DOWNLOAD_DIR)
}

async function optimizeInventory() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    throw new Error('sharp bulunamadi. Once `npm install --no-save sharp` calistir.')
  }

  const inventory = JSON.parse(await readFile(INVENTORY_PATH, 'utf8'))
  const manifest = []
  let originalBytes = 0
  let optimizedBytes = 0
  let converted = 0
  let skipped = 0
  let failed = 0

  for (const asset of inventory.assets) {
    const originalPath = safeLocalPathForUrl(asset.url)
    const optimizedKey = optimizedKeyForStorageKey(asset.storageKey)
    const optimizedPath = path.join(OPTIMIZED_DIR, optimizedKey)

    if (!existsSync(originalPath)) {
      failed += 1
      console.warn(`Orijinal yok: ${asset.storageKey}`)
      continue
    }

    const originalStat = await stat(originalPath)
    originalBytes += originalStat.size

    if (existsSync(optimizedPath)) {
      const optimizedStat = await stat(optimizedPath)
      optimizedBytes += optimizedStat.size
      skipped += 1
      manifest.push({ ...asset, optimizedKey, originalBytes: originalStat.size, optimizedBytes: optimizedStat.size })
      continue
    }

    await mkdir(path.dirname(optimizedPath), { recursive: true })
    const { width, quality } = optimizeSettings(asset.storageKey)
    try {
      await sharp(originalPath, { failOn: 'none' })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toFile(optimizedPath)
      const optimizedStat = await stat(optimizedPath)
      optimizedBytes += optimizedStat.size
      converted += 1
      manifest.push({ ...asset, optimizedKey, originalBytes: originalStat.size, optimizedBytes: optimizedStat.size })
    } catch (error) {
      failed += 1
      console.warn(`Optimize edilemedi: ${asset.storageKey} (${error.message})`)
    }

    if ((converted + skipped + failed) % 25 === 0) {
      console.log(`${converted} optimize, ${skipped} zaten vardi, ${failed} hata`)
    }
  }

  await writeFile(OPTIMIZED_MANIFEST_PATH, JSON.stringify({ createdAt: new Date().toISOString(), assets: manifest }, null, 2))
  const saved = originalBytes - optimizedBytes
  console.log(`\nOptimize tamam: ${converted} yeni, ${skipped} zaten vardi, ${failed} hata.`)
  console.log(`Orijinal: ${(originalBytes / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Optimize: ${(optimizedBytes / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Kazanc: ${(saved / 1024 / 1024).toFixed(2)} MB (${originalBytes ? Math.round((saved / originalBytes) * 100) : 0}%)`)
  console.log(OPTIMIZED_DIR)
}

async function uploadToR2() {
  const config = r2Config()
  const manifest = JSON.parse(await readFile(OPTIMIZED_MANIFEST_PATH, 'utf8')).assets
  let uploaded = 0
  let failed = 0

  for (const asset of manifest) {
    const filePath = path.join(OPTIMIZED_DIR, asset.optimizedKey)
    const body = await readFile(filePath)
    const payloadHash = hash(body)
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const region = 'auto'
    const service = 's3'
    const host = `${config.accountId}.r2.cloudflarestorage.com`
    const encodedKey = asset.optimizedKey.split(path.sep).map(encodeURIComponent).join('/')
    const canonicalUri = `/${config.bucket}/${encodedKey}`
    const canonicalHeaders = [
      `host:${host}`,
      'x-amz-content-sha256:' + payloadHash,
      'x-amz-date:' + amzDate,
      '',
    ].join('\n')
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hash(canonicalRequest)].join('\n')
    const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, region, service)
    const signature = hmac(signingKey, stringToSign, 'hex')
    const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    const res = await fetch(`https://${host}${canonicalUri}`, {
      method: 'PUT',
      headers: {
        Authorization: authorization,
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
      body,
    })

    if (!res.ok) {
      failed += 1
      console.warn(`Upload hata ${res.status}: ${asset.optimizedKey} ${await res.text()}`)
      continue
    }
    uploaded += 1
    if ((uploaded + failed) % 25 === 0) console.log(`${uploaded} upload, ${failed} hata`)
  }

  console.log(`\nR2 upload tamam: ${uploaded} upload, ${failed} hata.`)
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

async function generateUrlMap() {
  loadEnvFile()
  const publicUrl = process.env.R2_PUBLIC_URL || 'https://cdn.konseycomics.com'
  const manifest = JSON.parse(await readFile(OPTIMIZED_MANIFEST_PATH, 'utf8')).assets
  const replacements = manifest.map((asset) => ({
    oldUrl: asset.url,
    newUrl: buildR2Url(publicUrl, asset.optimizedKey),
    storageKey: asset.storageKey,
    optimizedKey: asset.optimizedKey,
    sources: asset.sources,
    originalBytes: asset.originalBytes,
    optimizedBytes: asset.optimizedBytes,
  }))

  await writeFile(URL_MAP_PATH, JSON.stringify({ createdAt: new Date().toISOString(), replacements }, null, 2))

  const candidateColumns = [
    ['seriler', 'kapak_url'],
    ['seriler', 'arkaplan_url'],
    ['seriler', 'hero_gorsel_url'],
    ['bolumler', 'kapak_url'],
    ['public_profiller', 'avatar_url'],
    ['public_profiller', 'banner_url'],
    ['profiller', 'avatar_url'],
    ['profiller', 'banner_url'],
    ['kategoriler', 'resim_url'],
    ['turler', 'resim_url'],
    ['ekip', 'avatar_url'],
    ['konsey_planet_yazilari', 'kapak_url'],
    ['topluluk_konulari', 'kapak_url'],
  ]

  const sql = [
    '-- KonseyComics media URL replacement',
    `-- Generated at ${new Date().toISOString()}`,
    '-- Run in Supabase SQL Editor after R2 upload is complete.',
    '',
    'begin;',
    '',
    'create or replace function public._konsey_replace_text_column(_table text, _column text, _old text, _new text)',
    'returns void',
    'language plpgsql',
    'as $$',
    'begin',
    '  if exists (',
    '    select 1 from information_schema.columns',
    "    where table_schema = 'public' and table_name = _table and column_name = _column",
    '  ) then',
    "    execute format('update public.%I set %I = replace(%I, $1, $2) where %I like $3', _table, _column, _column, _column)",
    "      using _old, _new, '%' || _old || '%';",
    '  end if;',
    'end;',
    '$$;',
    '',
    'create or replace function public._konsey_replace_jsonb_column(_table text, _column text, _old text, _new text)',
    'returns void',
    'language plpgsql',
    'as $$',
    'begin',
    '  if exists (',
    '    select 1 from information_schema.columns',
    "    where table_schema = 'public' and table_name = _table and column_name = _column",
    '  ) then',
    "    execute format('update public.%I set %I = replace(%I::text, $1, $2)::jsonb where %I::text like $3', _table, _column, _column, _column)",
    "      using _old, _new, '%' || _old || '%';",
    '  end if;',
    'end;',
    '$$;',
    '',
  ]

  for (const replacement of replacements) {
    sql.push(`-- ${replacement.storageKey} -> ${replacement.optimizedKey}`)
    for (const [table, column] of candidateColumns) {
      sql.push(`select public._konsey_replace_text_column(${sqlString(table)}, ${sqlString(column)}, ${sqlString(replacement.oldUrl)}, ${sqlString(replacement.newUrl)});`)
    }
    sql.push(`select public._konsey_replace_jsonb_column('site_ayarlari', 'deger', ${sqlString(replacement.oldUrl)}, ${sqlString(replacement.newUrl)});`)
    sql.push('')
  }

  sql.push('drop function if exists public._konsey_replace_text_column(text, text, text, text);')
  sql.push('drop function if exists public._konsey_replace_jsonb_column(text, text, text, text);')
  sql.push('')
  sql.push('commit;')
  await writeFile(SQL_PATH, sql.join('\n'))

  console.log(`${replacements.length} URL map olusturuldu.`)
  console.log(URL_MAP_PATH)
  console.log(SQL_PATH)
}

async function main() {
  const command = process.argv[2] || 'inventory'
  if (command === 'inventory') return buildInventory()
  if (command === 'download') return downloadInventory()
  if (command === 'optimize') return optimizeInventory()
  if (command === 'upload-r2') return uploadToR2()
  if (command === 'url-map') return generateUrlMap()
  throw new Error(`Bilinmeyen komut: ${command}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
