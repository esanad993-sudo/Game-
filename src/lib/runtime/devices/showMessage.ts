import { z } from 'zod'
import type { DeviceDefinition } from '../types'

export const ShowMessageDevice: DeviceDefinition<
  {
    show: z.ZodObject<{
      text: z.ZodOptional<z.ZodString>
      durationMs: z.ZodOptional<z.ZodNumber>
    }>
  },
  { onShown: z.ZodObject<{ text: z.ZodString }> }
> = {
  type: 'showMessage',
  name: 'Show Message',
  description:
    'Displays a message in the player UI overlay. Falls back to the configured default text.',
  category: 'action',
  icon: '💬',
  propertiesSchema: z.object({
    defaultText: z.string().default('Hello!'),
    defaultDurationMs: z.number().int().min(0).default(2000),
  }),
  defaultProperties: { defaultText: 'Hello!', defaultDurationMs: 2000 },
  inputs: {
    show: z.object({
      text: z.string().optional(),
      durationMs: z.number().optional(),
    }),
  },
  outputs: {
    onShown: z.object({ text: z.string() }),
  },
  setup(ctx) {
    ctx.on('show', ({ text, durationMs }) => {
      const finalText = text ?? ctx.instance.properties.defaultText
      const finalDur = durationMs ?? ctx.instance.properties.defaultDurationMs
      ctx.log(`ShowMessage: "${finalText}" (${finalDur}ms)`)
      ctx.emit('onShown', { text: finalText })
    })
  },
}
