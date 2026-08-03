import { z } from 'zod'
import type { DeviceDefinition } from '../types'

export const ButtonDevice: DeviceDefinition<
  Record<string, never>,
  { onPress: typeof onPressPayload }
> = {
  type: 'button',
  name: 'Button',
  description:
    'A pressable trigger. Emits `onPress` when activated (player click or external trigger).',
  category: 'trigger',
  icon: '🔘',
  propertiesSchema: z.object({
    label: z.string().default('Press me'),
    cooldownMs: z.number().int().min(0).default(0),
  }),
  defaultProperties: { label: 'Press me', cooldownMs: 0 },
  inputs: {},
  outputs: {
    onPress: z.object({ pressedAt: z.number() }),
  },
  setup(ctx) {
    ctx.log(`Button ready: "${ctx.instance.properties.label}"`)
  },
}

const onPressPayload = z.object({ pressedAt: z.number() })
