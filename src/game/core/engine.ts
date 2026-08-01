// ─── engine.ts ───────────────────────────────────────────────────────────────
// The fixed-timestep game loop + adaptive quality governor.
//
// Goals on a Dell Chromebook 3310 (Celeron N4020, UHD 600, 4 GB shared RAM):
//   • FIXED timestep physics → deterministic results, no tunneling.
//   • Cap DPR so the GPU never renders more pixels than it can fill.
//   • Auto-lower internal resolution when frame rate dips, restore when stable.
//   • The render loop never touches React/DOM (UI is out-of-band via events).

import { Input } from './input'
import { Renderer } from './renderer'

export interface EngineModule {
  /** Called once when the module becomes active. */
  onStart?(ctx: EngineContext): void
  /** Fixed-step update. dt is constant (FIXED_STEP). */
  update(dt: number, input: Input, ctx: EngineContext): void
  render(renderer: Renderer, ctx: EngineContext): void
  /** Called on canvas resize (CSS pixels). */
  resize(w: number, h: number): void
  onDestroy?(): void
}

export interface EngineContext {
  /** Logical width/height in CSS pixels (the world coordinate space). */
  readonly width: number
  readonly height: number
  /** Current device-pixel-ratio (already capped). */
  readonly dpr: number
  /** Current internal render scale (0.5..1). Lower = faster, softer. */
  readonly quality: number
  /** Query current real frame rate (rolling average). */
  readonly fps: number
}

export const FIXED_STEP = 1 / 60
/** Clamp a single frame to this many seconds to avoid the death spiral. */
const MAX_FRAME = 0.25
const QUALITY_MIN = 0.5
const QUALITY_MAX = 1.0

export interface EngineOptions {
  module: EngineModule
  width?: number
  height?: number
  dprCap?: number
  /** Target FPS for the quality governor. */
  targetFps?: number
}

export class GameEngine {
  module: EngineModule
  readonly input = new Input()
  renderer: Renderer
  private width: number
  private height: number
  private dprCap: number
  private targetFps: number
  private quality = 1
  private dpr = 1
  private fps = 60

  private accumulator = 0
  private lastTime = 0
  private raf = 0
  private running = false
  private destroyed = false

  // rolling frame-time stats
  private frameTimes: number[] = []
  private lowFrames = 0
  private highFrames = 0

  private ctx: EngineContext

  constructor(canvas: HTMLCanvasElement, renderer: Renderer, opts: EngineOptions) {
    this.module = opts.module
    this.renderer = renderer
    this.width = opts.width ?? (canvas.clientWidth || 800)
    this.height = opts.height ?? (canvas.clientHeight || 600)
    this.dprCap = opts.dprCap ?? 1.5
    this.targetFps = opts.targetFps ?? 60

    const self = this
    this.ctx = {
      get width() { return self.width },
      get height() { return self.height },
      get dpr() { return self.dpr },
      get quality() { return self.quality },
      get fps() { return self.fps },
    }

    this.input.attach(typeof window !== 'undefined' ? window : (null as unknown as Window))
    this.applyViewport()
    // Initialize the active module (deterministic — also enables headless tests).
    this.module.onStart?.(this.ctx)
  }

  private applyViewport(): void {
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, this.dprCap)
    this.dpr = dpr
    this.renderer.resize(this.width, this.height, dpr * this.quality)
    this.module.resize(this.width, this.height)
  }

  /** Manually resize (call on container resize). */
  resize(width: number, height: number): void {
    this.width = Math.max(64, width)
    this.height = Math.max(64, height)
    this.applyViewport()
  }

  /** Start the real-time loop. */
  start(): void {
    if (this.running || this.destroyed) return
    this.running = true
    this.lastTime = performance.now()
    const loop = (now: number) => {
      if (!this.running || this.destroyed) return
      let frame = (now - this.lastTime) / 1000
      this.lastTime = now
      if (frame > MAX_FRAME) frame = MAX_FRAME
      this.accumulate(frame)
      this.track(frame)
      this.render()
      this.input.endFrame()
      this.raf = this.rafNow(loop)
    }
    this.raf = this.rafNow(loop)
  }

  private rafNow(cb: (t: number) => void): number {
    return typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : 0
  }

  private cancelRaf(id: number): void {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(id)
  }

  /** Pause the loop (keeps state). */
  pause(): void {
    this.running = false
    this.cancelRaf(this.raf)
  }

  resume(): void {
    if (this.destroyed) return
    this.accumulator = 0
    this.lastTime = performance.now()
    this.running = true
    this.raf = this.rafNow(() => this.startInner())
  }

  private startInner(): void {
    if (!this.running) return
    this.start()
  }

  /**
   * Advance the simulation by exactly one fixed step. Useful for headless
   * tests and deterministic replay (no rAF needed).
   */
  step(): void {
    if (this.destroyed) return
    this.module.update(FIXED_STEP, this.input, this.ctx)
  }

  /** Advance by `seconds`, running N fixed steps. Deterministic for tests. */
  advance(seconds: number): void {
    let t = seconds
    while (t >= FIXED_STEP) {
      this.step()
      t -= FIXED_STEP
    }
  }

  private accumulate(frame: number): void {
    this.accumulator += frame
    let steps = 0
    while (this.accumulator >= FIXED_STEP) {
      this.module.update(FIXED_STEP, this.input, this.ctx)
      this.accumulator -= FIXED_STEP
      // guard against running away
      if (++steps > 16) {
        this.accumulator = 0
        break
      }
    }
  }

  private track(frame: number): void {
    this.frameTimes.push(frame)
    if (this.frameTimes.length > 60) this.frameTimes.shift()
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.frameTimes.length)
    this.fps = avg > 0 ? 1 / avg : 60
    const targetDt = 1 / this.targetFps
    if (avg > targetDt * 1.35 && this.frameTimes.length >= 30) {
      this.lowFrames++
      this.highFrames = 0
      if (this.lowFrames >= 20 && this.quality > QUALITY_MIN) {
        this.quality = Math.max(QUALITY_MIN, this.quality - 0.15)
        this.lowFrames = 0
        this.applyViewport()
      }
    } else if (avg < targetDt * 0.8 && this.frameTimes.length >= 30) {
      this.highFrames++
      this.lowFrames = 0
      if (this.highFrames >= 120 && this.quality < QUALITY_MAX) {
        this.quality = Math.min(QUALITY_MAX, this.quality + 0.1)
        this.highFrames = 0
        this.applyViewport()
      }
    } else {
      this.highFrames = 0
      this.lowFrames = 0
    }
  }

  private render(): void {
    const r = this.renderer
    r.begin([0.02, 0.05, 0.09])
    this.module.render(r, this.ctx)
    r.end()
  }

  /** Switch the active game module at runtime (e.g. menu → mode → results). */
  setModule(module: EngineModule): void {
    this.module.onDestroy?.()
    this.module = module
    module.onStart?.(this.ctx)
    module.resize(this.width, this.height)
  }

  destroy(): void {
    this.destroyed = true
    this.pause()
    this.input.destroy()
    this.module.onDestroy?.()
  }
}
