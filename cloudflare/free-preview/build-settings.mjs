export function validatePreviewBuildSettings(vars, env) {
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_KEY']) {
    if (!String(env[name] || '').trim()) throw new Error(`Missing preview build setting: ${name}`)
  }
  if (vars.KONSEY_PREVIEW_ACCOUNTS === '1' && !String(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim()) {
    throw new Error('Account preview requires NEXT_PUBLIC_TURNSTILE_SITE_KEY at build time; do not deploy a login form without CAPTCHA.')
  }
}

export function publicPreviewSettings(env) {
  return Object.fromEntries(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY']
    .filter(name => env[name]).map(name => [name, env[name]]))
}
