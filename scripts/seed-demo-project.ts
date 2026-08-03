// Standalone script: create + publish a demo project with devices + wires.
// Run with: bun run scripts/seed-demo-project.ts
//
// Useful for testing the full Phase 1.5 flow without manually clicking
// in the editor.
import { ProjectSchema } from '../src/lib/runtime'

const project = ProjectSchema.parse({
  version: 1,
  name: 'Bounty Demo',
  scene: {
    world: { width: 1600, height: 900, background: '#0F172A' },
    devices: [
      { id: 'sp1', type: 'spawnPoint', position: [200, 200], properties: { entityId: 'player1', components: { name: 'Alice', coins: 0 } } },
      { id: 'btn1', type: 'button', position: [450, 200], properties: { label: 'Tag!', cooldownMs: 0 } },
      { id: 'cnt1', type: 'counter', position: [700, 200], properties: { threshold: 3, initialValue: 0 } },
      { id: 'gc1', type: 'giveCoins', position: [950, 200], properties: { entityId: 'player1', defaultAmount: 50 } },
      { id: 'msg1', type: 'showMessage', position: [950, 400], properties: { defaultText: 'Bounty awarded!', defaultDurationMs: 2000 } },
    ],
    wires: [
      { id: 'w1', from: { deviceId: 'btn1', port: 'onPress' }, to: { deviceId: 'cnt1', port: 'increment' } },
      { id: 'w2', from: { deviceId: 'cnt1', port: 'onThreshold' }, to: { deviceId: 'gc1', port: 'grant' } },
      { id: 'w3', from: { deviceId: 'cnt1', port: 'onThreshold' }, to: { deviceId: 'msg1', port: 'show' } },
    ],
  },
  assets: {},
  scripts: {},
})

const server = process.env.SEED_SERVER_URL ?? 'http://localhost:3000'

async function main() {
  // Create
  const createRes = await fetch(`${server}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Bounty Demo', description: 'Click the Tag! button 3 times to award Alice 50 coins.', data: project, isPublic: false }),
  })
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({ error: 'unknown' }))
    throw new Error(`create failed: ${err.error}`)
  }
  const created = await createRes.json()
  console.log(`Created project: ${created.id} (editToken: ${created.editToken.slice(0, 8)}...)`)

  // Publish
  const pubRes = await fetch(`${server}/api/projects/${created.id}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publish: true, editToken: created.editToken }),
  })
  if (!pubRes.ok) throw new Error('publish failed')
  const pub = await pubRes.json()
  console.log(`Published: isPublic=${pub.isPublic}, version=${pub.version}`)
  console.log(`\nShare link: ${server}/play/${created.id}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
