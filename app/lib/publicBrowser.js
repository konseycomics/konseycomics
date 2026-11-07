import { createClient } from '@supabase/supabase-js'

// Public refreshes must never inherit a signed-in staff member's draft access.
export const publicBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'konsey-public-catalog' } },
)
