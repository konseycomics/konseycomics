import assert from 'node:assert/strict'

const base = process.env.AUDIT_BASE || 'http://localhost:8787'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Mock widget checks must never target a deployment')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  for (const failure of [false, true]) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', route => failure ? route.abort() : route.fulfill({
      contentType: 'application/javascript',
      body: `window.turnstile = {
        ready(callback) { setTimeout(callback, 30) },
        render(container, options) {
          if (options.appearance !== 'always' || options.size !== 'flexible') throw Error('Incorrect widget options');
          container.textContent = 'Mock widget initialized';
          options['before-interactive-callback']();
          return 'local-test-widget';
        },
        reset() {}, remove() {}
      };`,
    }))
    await page.goto(`${base}/giris`, { waitUntil: 'domcontentloaded' })
    if (failure) await page.getByRole('alert').filter({ hasText: 'Güvenlik doğrulaması yüklenemedi' }).waitFor()
    else await page.getByText('Mock widget initialized', { exact: true }).waitFor()
    console.log(failure ? 'Script failure is visible' : 'Deferred API readiness initializes the widget')
    await context.close()
  }
} finally { await browser.close() }
console.log('Local loader checks passed. No challenge solved, token generated, or authentication submitted.')
