import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publicPreviewSettings, validatePreviewBuildSettings } from '../cloudflare/free-preview/build-settings.mjs'

const publicEnv = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_KEY: 'public-test-key' }

test('account builds fail when CAPTCHA cannot render', () => {
  for (const value of [undefined, '', '   ']) {
    assert.throws(() => validatePreviewBuildSettings({ KONSEY_PREVIEW_ACCOUNTS: '1' }, { ...publicEnv, NEXT_PUBLIC_TURNSTILE_SITE_KEY: value }), /TURNSTILE_SITE_KEY/)
  }
})

test('configured account builds and read-only builds pass', () => {
  assert.doesNotThrow(() => validatePreviewBuildSettings({}, publicEnv))
  assert.doesNotThrow(() => validatePreviewBuildSettings({ KONSEY_PREVIEW_ACCOUNTS: '1' }, { ...publicEnv, NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'public-widget-key' }))
})

test('missing public database settings stop builds', () => {
  assert.throws(() => validatePreviewBuildSettings({}, {}), /SUPABASE_URL/)
})

test('remote build export never includes service keys, deploy hooks or unrelated public values', () => {
  assert.deepEqual(publicPreviewSettings({ ...publicEnv, SUPABASE_SERVICE_ROLE_KEY: 'private', CLOUDFLARE_API_TOKEN: 'private', DEPLOY_HOOK: 'private', NEXT_PUBLIC_ADMIN_PASS: 'private' }), publicEnv)
})
