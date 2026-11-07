import { readFileSync } from 'node:fs'
import { cp, mkdir, readdir, rm, stat, utimes } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export function assetPrefixFor(id) {
  if (!/^[a-f0-9]{16}$/.test(id || '')) throw new Error('Invalid preview asset release ID')
  return `/__konsey_build_${id}`
}

export function readAssetRelease(file) {
  try {
    const release = JSON.parse(readFileSync(file, 'utf8'))
    assetPrefixFor(release.id)
    return release
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export async function checkpointStaticAssets({ clientDir, historyDir, release }) {
  const prefix = release ? assetPrefixFor(release.id).slice(1) : ''
  const source = join(clientDir, prefix, '_next/static')
  try {
    await stat(source)
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
  const snapshot = join(historyDir, release?.id || 'legacy')
  const destination = join(snapshot, prefix, '_next/static')
  await mkdir(dirname(destination), { recursive: true })
  // Only compiled public assets are retained, never HTML snapshots or server files.
  await cp(source, destination, { recursive: true })
  const now = new Date()
  await utimes(snapshot, now, now)
  return true
}

export async function restoreStaticAssets({ clientDir, historyDir, keep = 3 }) {
  let entries
  try {
    entries = await readdir(historyDir, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return 0
    throw error
  }
  const snapshots = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^(legacy|[a-f0-9]{16})$/.test(entry.name)) continue
    const path = join(historyDir, entry.name)
    snapshots.push({ path, modified: (await stat(path)).mtimeMs })
  }
  snapshots.sort((a, b) => b.modified - a.modified)
  for (const snapshot of snapshots.slice(0, keep)) {
    await cp(snapshot.path, clientDir, { recursive: true, force: false })
  }
  for (const snapshot of snapshots.slice(keep)) await rm(snapshot.path, { recursive: true })
  return Math.min(snapshots.length, keep)
}
