import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerSkeleton } from '../../src/game/modes/runtime'
import { racerSkeleton } from '../../src/game/modes/racer/racer'
import { ModeStore, StorageLike } from '../../src/game/editor/modeStore'
import {
  createDraft, applyMeta, applySetting, applyVisual, applyScoring, applyGameOver,
  validate, describeGameOver, changeSkeleton,
} from '../../src/game/editor/modeBuilder'

registerSkeleton(racerSkeleton)

// in-memory storage for tests
function makeMemoryStorage(): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    getItem(k) { return store.has(k) ? store.get(k)! : null },
    setItem(k, v) { store.set(k, v) },
    removeItem(k) { store.delete(k) },
  }
}

test('createDraft builds a valid mode from skeleton defaults', () => {
  const d = createDraft('racer')
  assert.equal(d.skeleton, 'racer')
  assert.equal(d.gameOver.type, 'hearts')
  assert.equal(d.settings.lanes, 3)
  assert.deepEqual(validate(d), [])
})

test('applySetting clamps numbers to the spec range', () => {
  const d = createDraft('racer')
  // 'obstacleRate' is a number spec with range [0.3, 2]
  const clamped = applySetting(d, 'obstacleRate', 99)
  assert.equal(clamped.settings.obstacleRate, 2)
  const low = applySetting(d, 'obstacleRate', 0)
  assert.equal(low.settings.obstacleRate, 0.3)
})

test('applySetting coerces select settings to a valid option', () => {
  const d = createDraft('racer')
  // 'lanes' is a select with options ['2','3','4']
  const bad = applySetting(d, 'lanes', 9)
  assert.ok(['2', '3', '4'].includes(String(bad.settings.lanes)))
})

test('applySetting handles boolean coercion', () => {
  const d = createDraft('racer')
  const off = applySetting(d, 'shake', false)
  assert.equal(off.settings.shake, false)
  const on = applySetting(d, 'shake', true)
  assert.equal(on.settings.shake, true)
})

test('edits accumulate into a valid, playable definition', () => {
  let d = createDraft('racer')
  d = applyMeta(d, 'name', 'Fractions Dash')
  d = applyMeta(d, 'icon', '🔥')
  d = applySetting(d, 'lanes', 4)
  d = applyVisual(d, 'bgTop', '#123456')
  d = applyScoring(d, 'basePerCorrect', 250)
  d = applyGameOver(d, { type: 'distance', value: 800 })
  assert.equal(d.name, 'Fractions Dash')
  assert.equal(d.icon, '🔥')
  assert.equal(d.settings.lanes, 4)
  assert.equal(d.visuals.bgTop, '#123456')
  assert.equal(d.scoring.basePerCorrect, 250)
  assert.equal(d.gameOver.type, 'distance')
  assert.equal(d.gameOver.value, 800)
  assert.deepEqual(validate(d), [])
  assert.equal(describeGameOver(d), 'Reach distance (800)')
})

test('validate flags a missing name', () => {
  const d = createDraft('racer')
  const unnamed = applyMeta(d, 'name', '')
  assert.ok(validate(unnamed).some((e) => /name/i.test(e)))
})

test('changeSkeleton resets settings to the new skeleton defaults', () => {
  const d = createDraft('racer')
  const named = applyMeta(d, 'name', 'Keep Me')
  const switched = changeSkeleton(named, 'racer') // only one skeleton so far
  assert.equal(switched.name, 'Keep Me')
  assert.equal(switched.skeleton, 'racer')
})

test('ModeStore saves, lists, edits, and deletes modes', () => {
  const storage = makeMemoryStorage()
  const store = new ModeStore(storage, 'test_modes')

  assert.equal(store.list().length, 0)

  const a = createDraft('racer')
  const savedA = store.save(applyMeta(a, 'name', 'Alpha'))
  const b = createDraft('racer')
  const savedB = store.save(applyMeta(b, 'name', 'Beta'))

  assert.equal(store.list().length, 2)
  assert.equal(store.get(savedA.id)?.name, 'Alpha')

  // edit Alpha
  store.save(applyMeta(savedA, 'name', 'Alpha 2'))
  assert.equal(store.get(savedA.id)?.name, 'Alpha 2')
  assert.equal(store.list().length, 2)

  store.remove(savedB.id)
  assert.equal(store.list().length, 1)
  assert.equal(store.get(savedB.id), undefined)
})

test('ModeStore persists across instances (localStorage contract)', () => {
  const storage = makeMemoryStorage()
  const s1 = new ModeStore(storage, 'persist_key')
  const d = s1.save(applyMeta(createDraft('racer'), 'name', 'Persisted'))
  const s2 = new ModeStore(storage, 'persist_key')
  assert.equal(s2.list().length, 1)
  assert.equal(s2.get(d.id)?.name, 'Persisted')
})
