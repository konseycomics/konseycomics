import { createHmac, createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

export const runtime = 'nodejs'

const ALLOWED_BUCKETS = new Set(['avatarlar', 'bolum-kapaklari', 'kapaklar', 'site', 'forum'])
const USER_AVATAR_PREFIXES = new Set(['avatar', 'banner'])

function getClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Supabase environment variables are missing.')
  }

  return {
    publicClient: createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    adminClient: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  }
}

function r2Config() {
  const config = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicUrl: process.env.R2_PUBLIC_URL,
  }
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key)
  if (missing.length) throw new Error(`R2 env eksik: ${missing.join(', ')}`)
  return config
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

function optimizeSettings(storageKey) {
  const [bucket, filename] = storageKey.split('/')
  if (bucket === 'avatarlar' && filename?.startsWith('avatar-')) return { width: 512, quality: 78 }
  if (bucket === 'avatarlar' && filename?.startsWith('banner-')) return { width: 1600, quality: 78 }
  if (bucket === 'bolum-kapaklari') return { width: 900, quality: 78 }
  if (bucket === 'site') return { width: 1920, quality: 80 }
  if (bucket === 'forum') return { width: 1600, quality: 78 }
  if (bucket === 'kapaklar' && filename?.startsWith('sayfa-')) return { width: 1600, quality: 78 }
  if (bucket === 'kapaklar') return { width: 1100, quality: 80 }
  return { width: 1400, quality: 78 }
}

function safePrefix(value) {
  const normalized = String(value || 'resim').toLowerCase().replace(/[^a-z0-9_-]/g, '-')
  return normalized || 'resim'
}

function publicUrlFor(publicUrl, key) {
  return `${publicUrl.replace(/\/+$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`
}

async function getRequester(req) {
  const authHeader = req.headers.get('authorization') || ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!accessToken) return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }

  const { publicClient, adminClient } = getClients()
  const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)
  if (userError || !userData?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const userId = userData.user.id
  const [{ data: privateProfile }, { data: publicProfile }] = await Promise.all([
    adminClient.from('profiller').select('rol').eq('id', userId).maybeSingle(),
    adminClient.from('public_profiller').select('rol').eq('id', userId).maybeSingle(),
  ])
  const role = String(privateProfile?.rol || publicProfile?.rol || '').toLowerCase()

  return {
    userId,
    isAdmin: ['admin', 'yonetici'].includes(role),
  }
}

async function putR2Object(key, body) {
  const config = r2Config()
  const payloadHash = hash(body)
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const region = 'auto'
  const service = 's3'
  const host = `${config.accountId}.r2.cloudflarestorage.com`
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')
  const canonicalUri = `/${config.bucket}/${encodedKey}`
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
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

  if (!res.ok) throw new Error(`R2 upload failed (${res.status}): ${await res.text()}`)

  return publicUrlFor(config.publicUrl, key)
}

export async function POST(req) {
  try {
    const requester = await getRequester(req)
    if (requester.error) return requester.error

    const formData = await req.formData()
    const file = formData.get('file')
    const bucket = String(formData.get('bucket') || 'kapaklar')
    const prefix = safePrefix(formData.get('prefix') || 'resim')

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 })
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Geçersiz bucket.' }, { status: 400 })
    }

    const isUserUpload = (bucket === 'avatarlar' && USER_AVATAR_PREFIXES.has(prefix)) || bucket === 'forum'
    if (!requester.isAdmin && !isUserUpload) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    if (!String(file.type || '').startsWith('image/')) {
      return NextResponse.json({ error: 'Sadece görsel yüklenebilir.' }, { status: 400 })
    }

    if (Number(file.size || 0) > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Görsel en fazla 10 MB olabilir.' }, { status: 400 })
    }

    const original = Buffer.from(await file.arrayBuffer())
    const key = `${bucket}/${prefix}-${requester.userId}-${Date.now()}-${randomUUID().slice(0, 8)}.webp`
    const { width, quality } = optimizeSettings(key)
    const optimized = await sharp(original, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toBuffer()

    const url = await putR2Object(key, optimized)

    return NextResponse.json({
      ok: true,
      url,
      key,
      originalBytes: original.length,
      optimizedBytes: optimized.length,
    })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Upload failed.' }, { status: 500 })
  }
}
