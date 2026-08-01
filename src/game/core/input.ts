// ─── input.ts ────────────────────────────────────────────────────────────────
// Unified keyboard + pointer/touch input. Works headless (tests / no DOM) by
// no-oping when a target is not provided. Inputs are polled by the engine each
// frame; justPressed is consumed by the next poll.

export type InputListener = (this: unknown, ev: Event) => void

export class Input {
  readonly pressed = new Set<string>()
  readonly held = new Set<string>()
  pointerX = 0
  pointerY = 0
  pointerDown = false
  /** True only during the frame a pointer press occurred (for canvas buttons). */
  pointerJustPressed = false

  private justPressed = new Set<string>()
  private keys: Record<string, string> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    ' ': 'boost',
    Enter: 'confirm',
    // Letters intentionally NOT mapped here so 1–4 / A–D keys can answer questions.
  }

  /** Map an arbitrary string code to a canonical action name. */
  private canonical(code: string, key: string): string {
    return this.keys[code] ?? this.keys[key.toLowerCase()] ?? key.toLowerCase()
  }

  /** Bind to a DOM element (or window). No-op in headless environments. */
  attach(target: HTMLElement | Window): void {
    this.detach()
    if (!target) return
    this.target = target
    const down = (e: Event) => {
      const ev = e as KeyboardEvent
      const code = ev.code
      const action = this.canonical(code, ev.key)
      if (!this.held.has(action)) this.justPressed.add(action)
      this.held.add(action)
      if (code === ' ' || code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight') {
        e.preventDefault()
      }
    }
    const up = (e: Event) => {
      const ev = e as KeyboardEvent
      this.held.delete(this.canonical(ev.code, ev.key))
    }
    const move = (e: Event) => {
      const ev = e as PointerEvent
      this.pointerX = ev.clientX
      this.pointerY = ev.clientY
    }
    const downP = (e: Event) => {
      const ev = e as PointerEvent
      this.pointerX = ev.clientX
      this.pointerY = ev.clientY
      this.pointerDown = true
      this.pointerJustPressed = true
    }
    const upP = (e: Event) => {
      this.pointerDown = false
    }
    target.addEventListener('keydown', down)
    target.addEventListener('keyup', up)
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerdown', downP)
    target.addEventListener('pointerup', upP)
    this.cleanup = () => {
      target.removeEventListener('keydown', down)
      target.removeEventListener('keyup', up)
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerdown', downP)
      target.removeEventListener('pointerup', upP)
    }
  }

  private target: HTMLElement | Window | null = null
  private cleanup: (() => void) | null = null

  detach(): void {
    this.cleanup?.()
    this.cleanup = null
    this.target = null
    this.held.clear()
    this.pressed.clear()
  }

  /** Advance to the next frame: justPressed is recomputed. Call once per tick. */
  endFrame(): void {
    this.justPressed.clear()
    this.pointerJustPressed = false
  }

  /** True only during the frame the action was first pressed. */
  just(action: string): boolean {
    return this.justPressed.has(action)
  }

  /** True while the action is held down. */
  down(action: string): boolean {
    return this.held.has(action)
  }

  // ── programmatic input (used by tests and accessibility helpers) ──
  press(action: string): void {
    this.justPressed.add(action)
    this.held.add(action)
  }

  release(action: string): void {
    this.held.delete(action)
  }

  tap(x: number, y: number): void {
    this.pointerX = x
    this.pointerY = y
    this.pointerJustPressed = true
  }

  /** Clean up listeners. */
  destroy(): void {
    this.detach()
  }
}
