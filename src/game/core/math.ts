// ─── math.ts ─────────────────────────────────────────────────────────────────
// Tiny, allocation-free math helpers. Everything is plain numbers (no Vec2
// objects allocated per-frame) so the engine stays GC-friendly on low-RAM
// devices like the Dell Chromebook 3310 (4 GB shared with the iGPU).

export const TAU = Math.PI * 2

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Frame-rate independent damped approach. dt in seconds. */
export function damp(a: number, b: number, lambda: number, dt: number): number {
  return lerp(a, b, 1 - Math.exp(-lambda * dt))
}

export function smoothstep(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

/** Wrap a value into [0, max). */
export function wrap(v: number, max: number): number {
  const r = v % max
  return r < 0 ? r + max : r
}

/** Random float in [min, max). */
export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Random int in [min, max] inclusive. */
export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  return dx * dx + dy * dy
}
