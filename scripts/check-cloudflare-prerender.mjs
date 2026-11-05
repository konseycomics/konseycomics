import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const manifest = JSON.parse(await readFile(new URL('../dist/server/vinext-prerender.json', import.meta.url)))
const rendered = manifest.routes.filter(route => route.status === 'rendered')
assert.deepEqual(manifest.routes.filter(route => route.status === 'error'), [], 'Do not deploy a partial build')
const paths = new Set(rendered.map(route => route.path || route.route))
for (const path of ['/', '/seriler', '/yerli-eserler', '/seri/spider-man-reptilian-rage', '/oku/spider-man-reptilian-rage/1']) {
  assert.ok(paths.has(path), `Missing public snapshot: ${path}`)
}
for (const path of paths) {
  assert.ok(!/^\/(api|admin|auth|giris|profil|sifre-sifirla)(\/|$)/.test(path), `Private route in snapshots: ${path}`)
}
console.log(`Validated ${rendered.length} prerendered routes; no private routes or render errors`)
