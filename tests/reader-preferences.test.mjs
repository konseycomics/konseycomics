import test from 'node:test'
import assert from 'node:assert/strict'
import { loadReaderState, saveReaderState, READER_PREFERENCES_KEY } from '../app/lib/readerPreferences.js'

function storage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

test('first visit uses safe defaults', () => {
  assert.deepEqual(loadReaderState(storage(), 'chapter:a', 23), { page: 1, mode: 'scroll', spread: 'auto', offset: 0 })
})

test('progress is chapter-specific and preferences are shared', () => {
  const store = storage()
  saveReaderState(store, 'chapter:a', { page: 10, offset: 0.4, mode: 'flip', spread: 'single' })
  assert.deepEqual(loadReaderState(store, 'chapter:a', 23), { page: 10, offset: 0.4, mode: 'flip', spread: 'single' })
  assert.deepEqual(loadReaderState(store, 'chapter:b', 15), { page: 1, offset: 0, mode: 'flip', spread: 'single' })
})

test('stored positions are clamped when chapter length changes', () => {
  const store = storage()
  saveReaderState(store, 'chapter:a', { page: 30, offset: 2, mode: 'scroll', spread: 'double' })
  assert.equal(loadReaderState(store, 'chapter:a', 10).page, 10)
  assert.equal(loadReaderState(store, 'chapter:a', 10).offset, 1)
})

test('malformed JSON and unsupported modes do not break reading', () => {
  const store = storage()
  store.setItem(READER_PREFERENCES_KEY, '{broken')
  assert.equal(loadReaderState(store, 'chapter:a', 10).mode, 'scroll')
  store.setItem(READER_PREFERENCES_KEY, JSON.stringify({ mode: 'invalid', spread: 'invalid' }))
  store.setItem('chapter:a', JSON.stringify({ page: -3, offset: -1 }))
  assert.deepEqual(loadReaderState(store, 'chapter:a', 10), { page: 1, mode: 'scroll', spread: 'auto', offset: 0 })
})

test('disabled browser storage does not throw', () => {
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }
  assert.equal(loadReaderState(blocked, 'chapter:a', 10).page, 1)
  assert.doesNotThrow(() => saveReaderState(blocked, 'chapter:a', { page: 1 }))
})
