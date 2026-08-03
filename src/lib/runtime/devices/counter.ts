import { z } from 'zod'
import type { DeviceDefinition } from '../types'

export const CounterDevice: DeviceDefinition<
  {
    increment: z.ZodObject<Record<string, never>>
    decrement: z.ZodObject<Record<string, never>>
    reset: z.ZodObject<Record<string, never>>
  },
  {
    onChange: z.ZodObject<{ value: z.ZodNumber }>
    onThreshold: z.ZodObject<{ value: z.ZodNumber; threshold: z.ZodNumber }>
  }
> = {
  type: 'counter',
  name: 'Counter',
  description:
    'Counts events. Emits `onChange` after every change and `onThreshold` when value >= threshold (fires once per crossing).',
  category: 'logic',
  icon: '🔢',
  propertiesSchema: z.object({
    threshold: z.number().int().default(3),
    initialValue: z.number().int().default(0),
  }),
  defaultProperties: { threshold: 3, initialValue: 0 },
  inputs: {
    increment: z.object({}),
    decrement: z.object({}),
    reset: z.object({}),
  },
  outputs: {
    onChange: z.object({ value: z.number() }),
    onThreshold: z.object({ value: z.number(), threshold: z.number() }),
  },
  setup(ctx) {
    const threshold = ctx.instance.properties.threshold ?? 3
    ctx.state.value = ctx.instance.properties.initialValue ?? 0
    let fired = ctx.state.value >= threshold

    const announce = () => {
      ctx.emit('onChange', { value: ctx.state.value })
      if (!fired && ctx.state.value >= threshold) {
        fired = true
        ctx.emit('onThreshold', { value: ctx.state.value, threshold })
      } else if (fired && ctx.state.value < threshold) {
        fired = false
      }
    }

    ctx.on('increment', () => {
      ctx.state.value++
      announce()
    })
    ctx.on('decrement', () => {
      ctx.state.value--
      announce()
    })
    ctx.on('reset', () => {
      ctx.state.value = ctx.instance.properties.initialValue ?? 0
      fired = ctx.state.value >= threshold
      announce()
    })
  },
}
