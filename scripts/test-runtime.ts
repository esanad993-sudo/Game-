import {
  SceneRuntime,
  DeviceRegistry,
  BUILTIN_DEVICES,
  ProjectSchema,
} from '../src/lib/runtime'

const registry = new DeviceRegistry()
registry.registerAll(BUILTIN_DEVICES)

const project = ProjectSchema.parse({
  version: 1,
  name: 'Tag With Coins — Phase 0 Test',
  author: 'phase0',
  scene: {
    world: { width: 800, height: 600, background: '#0F172A' },
    devices: [
      {
        id: 'sp1',
        type: 'spawnPoint',
        position: [100, 100],
        properties: {
          entityId: 'player1',
          components: { name: 'Alice', coins: 0 },
        },
      },
      {
        id: 'btn1',
        type: 'button',
        position: [300, 100],
        properties: { label: 'Tag!', cooldownMs: 0 },
      },
      {
        id: 'cnt1',
        type: 'counter',
        position: [500, 100],
        properties: { threshold: 3, initialValue: 0 },
      },
      {
        id: 'gc1',
        type: 'giveCoins',
        position: [700, 100],
        properties: { entityId: 'player1', defaultAmount: 50 },
      },
      {
        id: 'msg1',
        type: 'showMessage',
        position: [700, 300],
        properties: {
          defaultText: 'Bounty awarded!',
          defaultDurationMs: 1500,
        },
      },
    ],
    wires: [
      { id: 'w1', from: { deviceId: 'btn1', port: 'onPress' }, to: { deviceId: 'cnt1', port: 'increment' } },
      { id: 'w2', from: { deviceId: 'cnt1', port: 'onThreshold' }, to: { deviceId: 'gc1', port: 'grant' } },
      { id: 'w3', from: { deviceId: 'cnt1', port: 'onThreshold' }, to: { deviceId: 'msg1', port: 'show' } },
    ],
  },
})

console.log('\n=== GameForge Runtime — Phase 0 Test ===\n')
const runtime = new SceneRuntime(project, registry)
runtime.start()

console.log('\n--- Simulating 3 button presses ---\n')
runtime.trigger('btn1', 'onPress', { pressedAt: Date.now() })
runtime.trigger('btn1', 'onPress', { pressedAt: Date.now() })
runtime.trigger('btn1', 'onPress', { pressedAt: Date.now() })

console.log('\n--- Snapshot ---')
const snap = runtime.snapshot()
console.log(JSON.stringify(snap, null, 2))

const player = runtime.world.getEntity('player1')!
const counterState = snap.deviceStates.find((d) => d.id === 'cnt1')?.state

let passed = true
const checks: Array<[string, boolean]> = [
  ['player1 exists', !!player],
  ['player1.coins === 50', player?.components.coins === 50],
  ['counter.value === 3', counterState?.value === 3],
]
console.log('\n--- Assertions ---')
for (const [label, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'}  ${label}`)
  if (!ok) passed = false
}

console.log('\n--- One-shot threshold check (pressing again should NOT re-grant) ---')
runtime.trigger('btn1', 'onPress', { pressedAt: Date.now() })
const coinsAfterExtraPress = player.components.coins
if (coinsAfterExtraPress === 50) {
  console.log(`✅  player1.coins still 50 after extra press (no duplicate grant)`)
} else {
  console.log(`❌  player1.coins = ${coinsAfterExtraPress} (expected 50 — threshold re-fired)`)
  passed = false
}

runtime.stop()
console.log('\n=== Result ===')
if (passed) {
  console.log('✅ Phase 0 runtime works end-to-end.\n')
  process.exit(0)
} else {
  console.log('❌ Phase 0 runtime has failing assertions.\n')
  process.exit(1)
}
