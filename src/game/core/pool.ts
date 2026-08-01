// ─── pool.ts ─────────────────────────────────────────────────────────────────
// Object pooling — the single most important GC optimization on a 4 GB
// Chromebook. Every entity (cars, obstacles, coins, particles, road segments)
// is recycled instead of allocated, so the render loop produces ~zero garbage.

export interface Poolable<T> {
  /** Release references back to the pool for reuse. */
  reset(): void
  /** True while the object is alive and should be updated/rendered. */
  active: boolean
}

export class Pool<T extends Poolable<T>> {
  private free: T[] = []
  private readonly factory: () => T
  private readonly onSpawn?: (item: T) => void

  constructor(factory: () => T, prealloc: number, onSpawn?: (item: T) => void) {
    this.factory = factory
    this.onSpawn = onSpawn
    for (let i = 0; i < prealloc; i++) {
      const item = factory()
      item.active = false
      this.free.push(item)
    }
  }

  /** Get an inactive object, or create one if the pool is exhausted. */
  acquire(): T {
    const item = this.free.length > 0 ? this.free.pop()! : this.factory()
    item.active = true
    this.onSpawn?.(item)
    return item
  }

  /** Return an object to the pool for reuse. */
  release(item: T): void {
    if (!item.active) return
    item.active = false
    item.reset()
    this.free.push(item)
  }

  /** Current number of cached (inactive) objects. */
  get available(): number {
    return this.free.length
  }
}
