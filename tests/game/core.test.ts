import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Pool } from '../../src/game/core/pool'
import { clamp, damp, lerp, randInt, wrap } from '../../src/game/core/math'
import { Input } from '../../src/game/core/input'

test('Pool recycles objects instead of allocating', () => {
  class Foo { active = false; v = 0; reset(): void { this.v = 0 } }
  const pool = new Pool<Foo>(() => new Foo(), 4)
  assert.equal(pool.available, 4)
  const a = pool.acquire()
  const b = pool.acquire()
  assert.equal(a.active, true)
  assert.equal(pool.available, 2)
  pool.release(a)
  assert.equal(a.active, false)
  assert.equal(pool.available, 3)
  const c = pool.acquire()
  assert.equal(c, a, 'released object is reused (no new allocation)')
  assert.equal(pool.available, 2)
  void b
})

test('math helpers behave', () => {
  assert.equal(clamp(5, 0, 3), 3)
  assert.equal(clamp(-1, 0, 3), 0)
  assert.equal(lerp(0, 10, 0.5), 5)
  assert.equal(wrap(-2, 5), 3)
  assert.ok(randInt(1, 1) === 1)
  // damp approaches target but never overshoots
  assert.ok(damp(0, 100, 10, 1) < 100)
})

test('Input is headless-safe and supports programmatic press', () => {
  const input = new Input()
  input.attach(null as never) // must not throw
  input.press('left')
  assert.equal(input.just('left'), true)
  assert.equal(input.down('left'), true)
  input.endFrame()
  assert.equal(input.just('left'), false)
  assert.equal(input.down('left'), true)
  input.destroy()
})
