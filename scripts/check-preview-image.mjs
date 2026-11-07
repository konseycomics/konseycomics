import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const source = await readFile(new URL('../cloudflare/free-preview/prepare-image.js', import.meta.url), 'utf8')
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  const page = await browser.newPage()
  const results = await page.evaluate(async source => {
    const { preparePreviewImage } = await import(`data:text/javascript;base64,${btoa(source)}`)
    const canvas = document.createElement('canvas')
    canvas.width = 2200; canvas.height = 3200
    const context = canvas.getContext('2d')
    context.fillStyle = '#e33'; context.fillRect(0, 0, 2200, 3200)
    const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    const input = new File([png], 'test.png', { type: 'image/png' })
    const results = []
    for (const format of ['webp', 'jpeg']) {
      const result = await preparePreviewImage(input, { bucket: 'kapaklar', prefix: 'sayfa', format })
      const bitmap = await createImageBitmap(result)
      results.push({ type: result.type, width: bitmap.width, height: bitmap.height, bytes: result.size })
      bitmap.close()
    }
    let svgRejected = false
    try { await preparePreviewImage(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }), {}) } catch { svgRejected = true }
    return { results, svgRejected }
  }, source)
  assert.equal(results.svgRejected, true)
  assert.deepEqual(results.results.map(r => r.type), ['image/webp', 'image/jpeg'])
  for (const result of results.results) { assert.equal(result.width, 1600); assert.equal(result.height, 2327); assert.ok(result.bytes < 4 * 1024 * 1024) }
  console.log('Browser PNG conversion, dimensions, JPEG/WebP output and SVG rejection passed; no remote upload performed.')
} finally { await browser.close() }
