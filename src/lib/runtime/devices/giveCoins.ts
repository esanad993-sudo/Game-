import { z } from 'zod'
import type { DeviceDefinition } from '../types'

export const GiveCoinsDevice: DeviceDefinition<
  {
    grant: z.ZodObject<{
      amount: z.ZodOptional<z.ZodNumber>
    }>
  },
  Record<string, never>
> = {
  type: 'giveCoins',
  name: 'Give Coins',
  description:
    'Adds coins to a configured entity. Used as a reward action when wired from triggers (button presses, threshold crossings, etc.).',
  category: 'action',
  icon: '🪙',
  propertiesSchema: z.object({
    entityId: z.string().default(''),
    defaultAmount: z.number().int().min(0).default(10),
  }),
  defaultProperties: { entityId: '', defaultAmount: 10 },
  inputs: {
    grant: z.object({
      amount: z.number().optional(),
    }),
  },
  outputs: {},
  setup(ctx) {
    ctx.on('grant', ({ amount }) => {
      const entityId = ctx.instance.properties.entityId
      if (!entityId) {
        ctx.log('GiveCoins: no entityId configured, skipping')
        return
      }
      const entity = ctx.world.getEntity(entityId)
      if (!entity) {
        ctx.log(`GiveCoins: entity not found: ${entityId}`)
        return
      }
      const delta = amount ?? ctx.instance.properties.defaultAmount
      entity.components.coins = (entity.components.coins ?? 0) + delta
      ctx.log(
        `GiveCoins: +${delta} → ${entityId} (total: ${entity.components.coins})`,
      )
    })
  },
}
