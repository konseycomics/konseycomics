const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase sunucu ayarlari gerekli.')
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  let after = null
  let count = 0
  for (;;) {
    let query = db.from('profiller').select('id').order('id').limit(100)
    if (after) query = query.gt('id', after)
    const { data, error } = await query
    if (error) throw error
    if (!data.length) break
    for (const user of data) {
      const { error: unlockError } = await db.rpc('unvan_v2_kazan', { p_user: user.id })
      if (unlockError) throw unlockError
      count++
    }
    after = data.at(-1).id
    console.log(`${count} profil kontrol edildi.`)
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
