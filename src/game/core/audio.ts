// ─── audio.ts ────────────────────────────────────────────────────────────────
// Tiny WebAudio synthesizer — no audio files, no network, ~0 bytes of assets.
// On constrained devices this matters a lot: no decode step, no memory for
// buffers. Sound is synthesized on the fly.

export type SfxName = 'boost' | 'correct' | 'wrong' | 'coin' | 'click' | 'gameover'

export class Audio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private _enabled = false

  /** Must be called from a user gesture (autoplay policy). */
  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.4
      this.master.connect(this.ctx.destination)
      this._enabled = true
    } catch {
      this._enabled = false
    }
  }

  get enabled(): boolean {
    return this._enabled
  }

  /** Resume/reset the context — call on first user interaction. */
  unlock(): void {
    this.init()
  }

  play(name: SfxName): void {
    if (!this._enabled || !this.ctx || !this.master) return
    switch (name) {
      case 'correct':
        this.tone(660, 0.09, 'square', 0.0, 990)
        break
      case 'wrong':
        this.tone(180, 0.22, 'sawtooth', 0.0, 120)
        break
      case 'coin':
        this.tone(880, 0.08, 'triangle', 0.0, 1320)
        break
      case 'boost':
        this.tone(200, 0.3, 'sawtooth', 0.05, 700)
        break
      case 'click':
        this.tone(440, 0.05, 'square', 0.0, 440)
        break
      case 'gameover':
        this.tone(400, 0.4, 'sawtooth', 0.0, 80)
        break
    }
  }

  /** A simple sweep from f0 to f1. All values allocated locally, then released. */
  private tone(f0: number, dur: number, type: OscillatorType, attack: number, f1: number): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    const t = ctx.currentTime
    osc.frequency.setValueAtTime(f0, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.5, t + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain)
    gain.connect(this.master!)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  destroy(): void {
    this.ctx?.close()
    this.ctx = null
    this.master = null
    this._enabled = false
  }
}
