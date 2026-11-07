import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assetPrefixFor, checkpointStaticAssets, restoreStaticAssets } from '../cloudflare/free-preview/asset-releases.mjs'

test('release IDs cannot escape the public asset directory', () => {
  assert.equal(assetPrefixFor('0123456789abcdef'), '/__konsey_build_0123456789abcdef')
  for (const id of ['', '../private', 'a'.repeat(17)]) assert.throws(() => assetPrefixFor(id))
})

test('retains only public compiled assets and preserves new build files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'konsey-assets-'))
  try {
    const clientDir = join(root, 'client')
    const historyDir = join(root, 'history')
    await mkdir(join(clientDir, '_next/static'), { recursive: true })
    await mkdir(join(clientDir, '_vinext'), { recursive: true })
    await writeFile(join(clientDir, '_next/static/old.js'), 'old')
    await writeFile(join(clientDir, '_vinext/private.html'), 'not retained')
    assert.equal(await checkpointStaticAssets({ clientDir, historyDir }), true)
    await rm(clientDir, { recursive: true })
    await mkdir(join(clientDir, '_next/static'), { recursive: true })
    await writeFile(join(clientDir, '_next/static/old.js'), 'new')
    assert.equal(await restoreStaticAssets({ clientDir, historyDir }), 1)
    assert.equal(await readFile(join(clientDir, '_next/static/old.js'), 'utf8'), 'new')
    await assert.rejects(access(join(clientDir, '_vinext/private.html')))
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('versioned retention is bounded and checkpoints only the active release', async () => {
  const root = await mkdtemp(join(tmpdir(), 'konsey-assets-'))
  try {
    const clientDir = join(root, 'client')
    const historyDir = join(root, 'history')
    for (let n = 1; n <= 4; n++) {
      const release = { id: String(n).padStart(16, '0') }
      const directory = join(clientDir, assetPrefixFor(release.id), '_next/static')
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'app.js'), String(n))
      assert.equal(await checkpointStaticAssets({ clientDir, historyDir, release }), true)
      if (n !== 1) await assert.rejects(access(join(historyDir, release.id, assetPrefixFor('0000000000000001'), '_next/static/app.js')))
    }
    assert.equal(await restoreStaticAssets({ clientDir, historyDir, keep: 3 }), 3)
    assert.equal(await checkpointStaticAssets({ clientDir: join(root, 'missing'), historyDir }), false)
  } finally { await rm(root, { recursive: true, force: true }) }
})
