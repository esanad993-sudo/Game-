import { z } from 'zod'
import type { World } from './world'

// ─── Port data schemas ───────────────────────────────────────────────────
export type PortData = z.ZodTypeAny
export type PortMap = Record<string, PortData>

// ─── Wire (connection between two device ports) ──────────────────────────
export const WireSchema = z.object({
  id: z.string(),
  from: z.object({ deviceId: z.string(), port: z.string() }),
  to: z.object({ deviceId: z.string(), port: z.string() }),
  transform: z.string().optional(),
})
export type Wire = z.infer<typeof WireSchema>

// ─── Device instance (placed in a scene) ─────────────────────────────────
export const DeviceInstanceSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.tuple([z.number(), z.number()]),
  properties: z.record(z.string(), z.any()).default({}),
})
export type DeviceInstance = z.infer<typeof DeviceInstanceSchema>

// ─── Project file (.gfpkg JSON) ──────────────────────────────────────────
export const ProjectSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  author: z.string().optional(),
  description: z.string().optional(),
  assets: z.record(z.string(), z.any()).default({}),
  scene: z.object({
    world: z
      .object({
        width: z.number().default(1600),
        height: z.number().default(900),
        background: z.string().default('#0F172A'),
      })
      .default({ width: 1600, height: 900, background: '#0F172A' }),
    devices: z.array(DeviceInstanceSchema),
    wires: z.array(WireSchema).default([]),
  }),
  scripts: z.record(z.string(), z.string()).default({}),
})
export type Project = z.infer<typeof ProjectSchema>

// ─── DeviceContext (handed to a device's setup() function) ───────────────
export interface DeviceContext<
  I extends PortMap = PortMap,
  O extends PortMap = PortMap,
> {
  on<K extends keyof I & string>(port: K, handler: (data: z.infer<I[K]>) => void): () => void
  emit<K extends keyof O & string>(port: K, data: z.infer<O[K]>): void
  world: World
  state: Record<string, any>
  instance: DeviceInstance
  schedule(ms: number, fn: () => void): () => void
  log(...args: any[]): void
}

// ─── DeviceDefinition ────────────────────────────────────────────────────
export type DeviceCategory = 'trigger' | 'logic' | 'action' | 'world' | 'quiz'

export interface DeviceDefinition<
  I extends PortMap = PortMap,
  O extends PortMap = PortMap,
> {
  type: string
  name: string
  description: string
  category: DeviceCategory
  icon: string
  propertiesSchema: z.ZodTypeAny
  defaultProperties: Record<string, any>
  inputs: I
  outputs: O
  setup(ctx: DeviceContext<I, O>): void | (() => void)
}
