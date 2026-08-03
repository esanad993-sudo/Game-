import { z } from 'zod'
import type { DeviceDefinition } from '../types'

export const SpawnPointDevice: DeviceDefinition<
  Record<string, never>,
  { onSpawned: z.ZodObject<{ entityId: z.ZodString }> }
> = {
  type: 'spawnPoint',
  name: 'Spawn Point',
  description:
    'Spawns an entity at scene start with the given components. Position is taken from the device canvas.',
  category: 'world',
  icon: '📍',
  propertiesSchema: z.object({
    entityId: z.string().default(''),
    components: z.record(z.string(), z.any()).default({}),
  }),
  defaultProperties: { entityId: '', components: {} },
  inputs: {},
  outputs: {
    onSpawned: z.object({ entityId: z.string() }),
  },
  setup(ctx) {
    const { entityId, components } = ctx.instance.properties
    if (!entityId) {
      ctx.log('SpawnPoint: no entityId set, skipping')
      return
    }
    try {
      ctx.world.spawn(entityId, {
        position: ctx.instance.position,
        ...components,
      })
      ctx.log(`SpawnPoint: spawned ${entityId}`)
      ctx.emit('onSpawned', { entityId })
    } catch (e) {
      ctx.log(`SpawnPoint: failed to spawn ${entityId}:`, (e as Error).message)
    }
  },
}
