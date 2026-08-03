import {
  ProjectSchema,
  type Project,
  type DeviceInstance,
  type DeviceContext,
  type DeviceDefinition,
} from './types'
import { World } from './world'
import { EventBus } from './eventBus'
import type { DeviceRegistry } from './registry'

interface DeviceRuntime {
  def: DeviceDefinition
  instance: DeviceInstance
  ctx: DeviceContext<any, any>
  cleanup?: () => void
}

export class SceneRuntime {
  readonly project: Project
  readonly world = new World()
  private registry: DeviceRegistry
  private devices = new Map<string, DeviceRuntime>()
  private bus = new EventBus()
  private started = false
  private timers: ReturnType<typeof setTimeout>[] = []

  constructor(projectJson: unknown, registry: DeviceRegistry) {
    this.project = ProjectSchema.parse(projectJson)
    this.registry = registry
  }

  start(): void {
    if (this.started) throw new Error('SceneRuntime already started')
    this.started = true

    for (const instance of this.project.scene.devices) {
      const def = this.registry.get(instance.type)
      if (!def) {
        throw new Error(
          `Unknown device type "${instance.type}" (device id: ${instance.id}). ` +
            `Did you forget to register it?`,
        )
      }

      const mergedProperties = { ...def.defaultProperties, ...instance.properties }
      const fullInstance: DeviceInstance = { ...instance, properties: mergedProperties }

      const ctx: DeviceContext<any, any> = {
        instance: fullInstance,
        world: this.world,
        state: {},
        on: (port, handler) => this.bus.on(`${instance.id}.${port}`, handler),
        emit: (port, data) => this.dispatch(instance.id, port as string, data),
        schedule: (ms, fn) => {
          const t = setTimeout(() => {
            try {
              fn()
            } catch (e) {
              this.log(instance.id, 'scheduled callback error:', e)
            }
          }, ms)
          this.timers.push(t)
          return () => clearTimeout(t)
        },
        log: (...args) => this.log(instance.id, ...args),
      }

      const rt: DeviceRuntime = { def, instance: fullInstance, ctx }
      this.devices.set(instance.id, rt)

      const cleanup = def.setup(ctx)
      rt.cleanup = typeof cleanup === 'function' ? cleanup : undefined
    }

    for (const wire of this.project.scene.wires) {
      const fromTopic = `${wire.from.deviceId}.${wire.from.port}`
      const toTopic = `${wire.to.deviceId}.${wire.to.port}`
      this.bus.on(fromTopic, (data) => {
        this.bus.emit(toTopic, data)
      })
    }
  }

  stop(): void {
    if (!this.started) return
    for (const t of this.timers) clearTimeout(t)
    this.timers = []
    for (const { cleanup, instance } of this.devices.values()) {
      try {
        cleanup?.()
      } catch (e) {
        this.log(instance.id, 'cleanup error:', e)
      }
    }
    this.devices.clear()
    this.bus.clear()
    this.world.clear()
    this.started = false
  }

  trigger(deviceId: string, port: string, data: any = {}): void {
    if (!this.started) throw new Error('SceneRuntime not started — call start() first')
    this.dispatch(deviceId, port, data)
  }

  snapshot() {
    return {
      world: this.world.snapshot(),
      deviceStates: Array.from(this.devices.entries()).map(([id, rt]) => ({
        id,
        type: rt.instance.type,
        state: { ...rt.ctx.state },
      })),
    }
  }

  getDevices(): DeviceInstance[] {
    return Array.from(this.devices.values()).map((rt) => rt.instance)
  }

  private dispatch(deviceId: string, port: string, data: any): void {
    const device = this.devices.get(deviceId)
    if (!device) {
      this.log(deviceId, `unknown device — cannot emit "${port}"`)
      return
    }
    if (!(port in device.def.outputs)) {
      this.log(deviceId, `device has no output port "${port}"`)
      return
    }
    this.bus.emit(`${deviceId}.${port}`, data)
  }

  private log(deviceId: string, ...args: any[]): void {
    console.log(`[scene:${deviceId}]`, ...args)
  }
}
