import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.AUDIT_BASE || 'http://localhost:8787'
const output = process.env.AUDIT_OUTPUT || '/tmp/konsey-cloudflare-preview'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const results = []
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, isMobile: width === 390, hasTouch: width === 390 })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*.supabase.co/**', route => {
      return ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort()
    })
    for (const path of ['/', '/seriler', '/seri/spider-man-reptilian-rage', '/oku/spider-man-reptilian-rage/1', '/forum']) {
      const response = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.locator('h1').first().waitFor()
      await page.waitForTimeout(1200)
      assert.equal(response.status(), 200, path)
      assert.match(response.headers()['x-robots-tag'], /noindex/)
      assert.equal(response.headers()['x-konsey-preview'], 'read-only-free-tier')
      assert.ok(await page.locator('h1').count(), path + ' h1')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, path + ' overflow')
      if (path === '/seriler') {
        await page.getByRole('textbox', { name: 'Arşivde ara' }).fill('Daredevil')
        await page.waitForURL(/q=Daredevil/)
        assert.ok(await page.locator('a.archive-card').count())
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1200)
        assert.equal(await page.getByRole('textbox', { name: 'Arşivde ara' }).inputValue(), 'Daredevil')
        assert.ok(await page.locator('a.archive-card').count())
      }
      if (path.startsWith('/oku/')) {
        const reader = page.locator('.isolated-reader')
        await reader.locator('.isolated-reader-pages img').first().waitFor()
        await reader.getByRole('button', { name: 'Tam ekran', exact: true }).click()
        await page.getByRole('dialog').waitFor()
        await reader.getByRole('button', { name: 'Sayfa Çevir', exact: true }).click()
        await reader.locator('.reader-book-sheet img').first().waitFor()
        await reader.getByRole('button', { name: 'Sonraki sayfa', exact: true }).click()
        await page.waitForTimeout(1100)
        assert.ok(!(await reader.getByRole('button', { name: 'Önceki sayfa', exact: true }).isDisabled()))
        await reader.getByRole('button', { name: 'Okuma ekranından çık', exact: true }).click()
      }
      if (path === '/forum') {
        const topics = page.locator('.forum-topic-copy > a')
        assert.ok(await topics.count(), 'Forum must contain real topics')
        const title = await topics.first().innerText()
        const destination = await topics.first().getAttribute('href')
        const navigation = page.waitForNavigation({ waitUntil: 'domcontentloaded' })
        await topics.first().click()
        const topicResponse = await navigation
        assert.equal(topicResponse.status(), 200)
        await page.locator('h1').filter({ hasText: title }).waitFor()
        assert.equal(new URL(page.url()).pathname, destination)
        await page.goBack({ waitUntil: 'domcontentloaded' })
        await page.locator('.forum-topic-copy > a').first().waitFor()
      }
      await page.screenshot({ path: `${output}/${width}-${path.replaceAll('/', '_') || 'home'}.png` })
      results.push({ width, path, status: response.status() })
    }
    assert.deepEqual(errors, [])
    await context.close()
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} finally { await browser.close() }
