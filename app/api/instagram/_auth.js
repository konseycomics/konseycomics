import { createClient } from '@supabase/supabase-js'

export function instagramClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) throw new Error('Supabase environment variables are missing.')
  return {
    publicClient: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }),
    adminClient: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }),
  }
}

export async function requireInstagramAdmin(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { publicClient, adminClient } = instagramClients()
  const { data } = await publicClient.auth.getUser(token)
  if (!data?.user?.id) return null
  const { data: profile } = await adminClient.from('profiller').select('rol').eq('id', data.user.id).maybeSingle()
  if (!['admin', 'yonetici'].includes(String(profile?.rol || '').toLowerCase())) return null
  return { user: data.user, adminClient }
}
