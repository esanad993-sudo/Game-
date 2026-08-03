import type { DeviceDefinition } from './types'

export class DeviceRegistry {
  private devices = new Map<string, DeviceDefinition<any, any>>()

  register(def: DeviceDefinition<any, any>): void {
    if (this.devices.has(def.type)) {
      throw new Error(`Device type already registered: ${def.type}`)
    }
    this.devices.set(def.type, def)
  }

  get(type: string): DeviceDefinition<any, any> | undefined {
    return this.devices.get(type)
  }

  list(): DeviceDefinition<any, any>[] {
    return Array.from(this.devices.values())
  }

  listByCategory(): Record<string, DeviceDefinition<any, any>[]> {
    const out: Record<string, DeviceDefinition<any, any>[]> = {}
    for (const def of this.devices.values()) {
      ;(out[def.category] ??= []).push(def)
    }
    return out
  }

  registerAll(defs: DeviceDefinition<any, any>[]): void {
    for (const def of defs) this.register(def)
  }
}
