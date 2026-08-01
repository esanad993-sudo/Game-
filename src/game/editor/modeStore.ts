// ─── editor/modeStore.ts ─────────────────────────────────────────────────────
// Persistence for saved modes. Backed by localStorage by default so it works
// offline on a Chromebook and needs no server; the storage is injectable so it
// can be swapped for a Prisma/API-backed store later and unit-tested now.

import type { ModeDefinition } from '../modes/types'
import { validateModeDefinition } from '../modes/runtime'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const DEFAULT_KEY = 'gameforge_saved_modes'

export class ModeStore {
  private storage: StorageLike
  private key: string
  private cache: ModeDefinition[] | null = null

  constructor(storage?: StorageLike, key: string = DEFAULT_KEY) {
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null as unknown as StorageLike)
    this.key = key
  }

  private read(): ModeDefinition[] {
    if (this.cache) return this.cache
    let raw: string | null = null
    try {
      raw = this.storage.getItem(this.key)
    } catch {
      raw = null
    }
    let arr: ModeDefinition[] = []
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) arr = parsed as ModeDefinition[]
      } catch {
        arr = []
      }
    }
    this.cache = arr
    return arr
  }

  private persist(arr: ModeDefinition[]): void {
    this.cache = arr
    try {
      this.storage.setItem(this.key, JSON.stringify(arr))
    } catch {
      // storage full / unavailable — keep in-memory cache
    }
  }

  list(): ModeDefinition[] {
    return this.read().slice().sort((a, b) => a.name.localeCompare(b.name))
  }

  get(id: string): ModeDefinition | undefined {
    return this.read().find((m) => m.id === id)
  }

  /** Save a mode. Returns the saved definition. */
  save(mode: ModeDefinition): ModeDefinition {
    const arr = this.read()
    const idx = arr.findIndex((m) => m.id === mode.id)
    const next = { ...mode, id: mode.id || `${mode.skeleton}_${Date.now()}` }
    if (idx >= 0) arr[idx] = next
    else arr.push(next)
    this.persist(arr)
    return next
  }

  remove(id: string): void {
    this.persist(this.read().filter((m) => m.id !== id))
  }

  /** Returns a list of problems if a mode isn't saveable. */
  problems(mode: ModeDefinition): string[] {
    return validateModeDefinition(mode)
  }

  clear(): void {
    this.cache = []
    try {
      this.storage.removeItem(this.key)
    } catch {
      // ignore
    }
  }
}
