// ─── modes/racer/racer.ts ────────────────────────────────────────────────────
// "Racer" — a top-down, lane-based driving quiz. Answer questions to boost,
// avoid cones, collect coins. This is a CODE-defined Skeleton; a teacher/student
// can also create many variations of it purely as data (see visual.ts).
//
// All entities are pooled and every per-frame value is reused, keeping the
// render loop ~garbage-free on a 4 GB Chromebook.

import { EngineContext, EngineModule } from '../../core/engine'
import { Input } from '../../core/input'
import { Renderer } from '../../core/renderer'
import { Pool } from '../../core/pool'
import { clamp, damp, lerp, rand, randInt, TAU, wrap } from '../../core/math'
import {
  GameResult,
  ModeDefinition,
  ModeHooks,
  QuestionData,
  SkeletonMeta,
} from '../types'
import { Skeleton } from '../runtime'

// ── helpers ──
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function wrapText(renderer: Renderer, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (renderer.textWidth(test, size) <= maxWidth || !line) {
      line = test
    } else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines
}

// ── pooled entities ──
class Obstacle { active = false; lane = 0; y = 0; reset(): void { this.lane = 0; this.y = 0 } }
class Coin { active = false; lane = 0; y = 0; spin = 0; taken = false; reset(): void { this.lane = 0; this.y = 0; this.spin = 0; this.taken = false } }
class Particle { active = false; x = 0; y = 0; vx = 0; vy = 0; life = 0; maxLife = 0; size = 6; reset(): void { this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.life = 0; this.maxLife = 0; this.size = 6 } }

type State = 'playing' | 'question' | 'gameover'

interface QuestionUI {
  q: QuestionData
  questionIndex: number
  rects: { x: number; y: number; w: number; h: number }[]
  answered: boolean
  chosenCorrect: boolean
  feedbackTimer: number
}

class RacerGame implements EngineModule {
  private def: ModeDefinition
  private questions: QuestionData[]
  private hooks: ModeHooks

  // tuning (from settings)
  private lanes = 3
  private speed = 220
  private maxSpeed = 460
  private obstacleRate = 1.0
  private coinRate = 0.8
  private questionInterval = 6
  private shakeOn = true

  // game-over rules
  private overType: ModeDefinition['gameOver']['type']
  private hearts: number
  private timer: number
  private finishDistance: number
  private questionsToAnswer: number

  // live state
  private state: State = 'playing'
  private score = 0
  private coins = 0
  private correct = 0
  private wrong = 0
  private streak = 0
  private bestStreak = 0
  private distance = 0
  private elapsed = 0
  private currentSpeed = 0
  private speedBoost = 0 // 0..1 boost amount
  private playerLane = 1
  private playerX = 0
  private shake = 0

  private obstacleTimer = 0
  private coinTimer = 0
  private questionTimer = 0
  private nextQIndex = 0

  private obstacles = new Pool<Obstacle>(() => new Obstacle(), 16)
  private coinsPool = new Pool<Coin>(() => new Coin(), 16)
  private particles = new Pool<Particle>(() => new Particle(), 48)
  private liveO: Obstacle[] = []
  private liveC: Coin[] = []
  private liveP: Particle[] = []

  private ui: QuestionUI | null = null

  // layout (computed on resize)
  private roadLeft = 0
  private roadWidth = 460
  private laneWidth = 0
  private playerY = 0

  private viewW = 800
  private viewH = 600

  constructor(def: ModeDefinition, questions: QuestionData[], hooks: ModeHooks) {
    this.def = def
    this.questions = questions
    this.hooks = hooks

    const s = def.settings
    this.lanes = clamp(Math.round((s.lanes as number) || 3), 2, 4)
    this.speed = (s.speed as number) ?? 220
    this.maxSpeed = (s.maxSpeed as number) ?? 460
    this.obstacleRate = (s.obstacleRate as number) ?? 1
    this.coinRate = (s.coinRate as number) ?? 0.8
    this.questionInterval = (s.questionInterval as number) ?? 6
    this.shakeOn = (s.shake as boolean) ?? true

    const go = def.gameOver
    this.overType = go.type
    this.hearts = go.type === 'hearts' ? go.value : 9999
    this.timer = go.type === 'timer' ? go.value : Infinity
    this.finishDistance = go.type === 'distance' ? go.value : Infinity
    this.questionsToAnswer = go.type === 'questions' ? go.value : Infinity
  }

  onStart(ctx: EngineContext): void {
    this.resize(ctx.width, ctx.height)
    this.state = 'playing'
    this.currentSpeed = this.speed
    this.playerLane = Math.floor(this.lanes / 2)
    this.questionTimer = this.questionInterval
  }

  resize(w: number, h: number): void {
    this.viewW = w
    this.viewH = h
    this.roadWidth = Math.min(w * 0.58, 480)
    this.roadLeft = (w - this.roadWidth) / 2
    this.laneWidth = this.roadWidth / this.lanes
    this.playerY = h - 130
    this.playerX = this.roadLeft + this.playerLane * this.laneWidth + this.laneWidth / 2
  }

  // ── spawners ──
  private spawnObstacle(): void {
    const lane = randInt(0, this.lanes - 1)
    const o = this.obstacles.acquire()
    o.lane = lane
    o.y = -80
    this.liveO.push(o)
  }

  private spawnCoin(): void {
    const c = this.coinsPool.acquire()
    c.lane = randInt(0, this.lanes - 1)
    c.y = -60
    c.spin = rand(0, TAU)
    this.liveC.push(c)
  }

  private emit(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const p = this.particles.acquire()
      p.x = x
      p.y = y
      p.vx = rand(-120, 120)
      p.vy = rand(-40, 160)
      p.life = p.maxLife = rand(0.3, 0.7)
      p.size = rand(5, 12)
      this.liveP.push(p)
    }
  }

  // ── question flow ──
  private beginQuestion(): void {
    const q = this.questions[this.nextQIndex % this.questions.length]
    this.nextQIndex++
    this.state = 'question'
    // build button rects
    const n = q.choices.length
    const bw = Math.min(this.viewW * 0.42, 360)
    const bh = Math.max(56, Math.min(84, this.viewH * 0.12))
    const gap = 14
    const cols = n === 2 ? 2 : 2
    const rows = Math.ceil(n / cols)
    const totalH = rows * bh + (rows - 1) * gap
    const top = this.viewH / 2 - 40
    const rects: QuestionUI['rects'] = []
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols)
      const c = i % cols
      const x = this.viewW / 2 - bw + c * (bw + gap)
      const y = top + totalH / 2 - rows * bh / 2 + r * (bh + gap)
      rects.push({ x, y, w: bw, h: bh })
    }
    this.ui = { q, questionIndex: this.nextQIndex - 1, rects, answered: false, chosenCorrect: false, feedbackTimer: 0 }
    this.hooks.onScore?.(this.score)
  }

  private submitAnswer(input: Input, idx: number): void {
    const ui = this.ui
    if (!ui || ui.answered) return
    ui.answered = true
    const q = ui.q
    const correct = idx === q.correctIdx
    ui.chosenCorrect = correct
    if (correct) {
      this.correct++
      this.streak++
      if (this.streak > this.bestStreak) this.bestStreak = this.streak
      const streakBonus = this.def.scoring.streakBonus * Math.max(0, this.streak - 1)
      const pts = this.def.scoring.basePerCorrect + streakBonus
      this.score += pts
      this.coins += this.def.scoring.coinPerCorrect
      this.speedBoost = 1
      this.emit(this.playerX, this.playerY - 20, 10)
      this.hooks.onCoins?.(this.coins)
    } else {
      this.wrong++
      this.streak = 0
      this.loseHeart()
    }
    this.hooks.onScore?.(this.score)
    ui.feedbackTimer = 0.9
  }

  private loseHeart(): void {
    this.hearts--
    this.shake = 0.5
    this.speedBoost = 0
    if (this.hearts <= 0) {
      this.state = 'gameover'
      this.finish()
    }
  }

  private checkGameOver(): void {
    if (this.overType === 'timer' && this.elapsed >= this.timer) this.finish()
    else if (this.overType === 'distance' && this.distance >= this.finishDistance) this.finish()
    else if (this.overType === 'questions' && this.correct + this.wrong >= this.questionsToAnswer) this.finish()
  }

  private finish(): void {
    this.state = 'gameover'
    const result: GameResult = {
      score: this.score,
      correct: this.correct,
      wrong: this.wrong,
      bestStreak: this.bestStreak,
      coins: this.coins,
      distance: Math.round(this.distance),
      duration: Math.round(this.elapsed),
    }
    this.hooks.onGameOver?.(result)
  }

  // ── update ──
  update(dt: number, input: Input, ctx: EngineContext): void {
    if (this.state === 'gameover') return

    if (this.state === 'question') {
      this.updateQuestion(dt, input, ctx)
      return
    }

    // playing
    this.elapsed += dt
    this.distance += this.currentSpeed * dt

    // boost recovery
    this.speedBoost = Math.max(0, this.speedBoost - dt * 0.6)
    const boosted = this.speedBoost > 0
    const target = boosted ? this.maxSpeed : this.speed
    this.currentSpeed = damp(this.currentSpeed, target, boosted ? 3 : 1.5, dt)

    // steering
    if (input.down('left')) this.playerLane = Math.max(0, this.playerLane - 1)
    if (input.down('right')) this.playerLane = Math.min(this.lanes - 1, this.playerLane + 1)
    const tx = this.roadLeft + this.playerLane * this.laneWidth + this.laneWidth / 2
    this.playerX = damp(this.playerX, tx, 12, dt)

    // spawners
    this.obstacleTimer -= dt
    if (this.obstacleTimer <= 0) { this.spawnObstacle(); this.obstacleTimer = 1 / this.obstacleRate }
    this.coinTimer -= dt
    if (this.coinTimer <= 0) { this.spawnCoin(); this.coinTimer = 1 / this.coinRate }
    this.questionTimer -= dt
    if (this.questionTimer <= 0) {
      this.beginQuestion()
      return
    }

    // move entities down
    this.scrollEntities(this.currentSpeed * dt)

    // collisions
    this.handleCollisions()

    // particles
    this.updateParticles(dt)

    // shake decay
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.6)

    this.checkGameOver()
  }

  private scrollEntities(dy: number): void {
    const h = this.viewH + 120
    for (let i = this.liveO.length - 1; i >= 0; i--) {
      const o = this.liveO[i]
      o.y += dy
      if (o.y > h) { this.obstacles.release(o); this.liveO.splice(i, 1) }
    }
    for (let i = this.liveC.length - 1; i >= 0; i--) {
      const c = this.liveC[i]
      c.y += dy
      c.spin += dy * 0.02
      if (c.y > h) { this.coinsPool.release(c); this.liveC.splice(i, 1) }
    }
  }

  private handleCollisions(): void {
    const hitY = this.playerY
    const laneX = (lane: number) => this.roadLeft + lane * this.laneWidth + this.laneWidth / 2
    const px = this.playerX

    for (let i = this.liveO.length - 1; i >= 0; i--) {
      const o = this.liveO[i]
      const ox = laneX(o.lane)
      if (Math.abs(o.y - hitY) < 64 && Math.abs(ox - px) < this.laneWidth * 0.75) {
        this.obstacles.release(o)
        this.liveO.splice(i, 1)
        this.loseHeart()
        this.emit(px, hitY, 8)
        if (this.state !== 'playing') return
      }
    }
    for (let i = this.liveC.length - 1; i >= 0; i--) {
      const c = this.liveC[i]
      const cx = laneX(c.lane)
      if (Math.abs(c.y - hitY) < 56 && Math.abs(cx - px) < this.laneWidth * 0.7) {
        this.coinsPool.release(c)
        this.liveC.splice(i, 1)
        this.coins++
        this.emit(cx, c.y, 4)
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.liveP.length - 1; i >= 0; i--) {
      const p = this.liveP[i]
      p.life -= dt
      if (p.life <= 0) { this.particles.release(p); this.liveP.splice(i, 1); continue }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy -= 60 * dt
    }
  }

  private updateQuestion(dt: number, input: Input, ctx: EngineContext): void {
    const ui = this.ui
    if (!ui) return
    if (ui.answered) {
      ui.feedbackTimer -= dt
      if (ui.feedbackTimer <= 0) {
        this.state = 'playing'
        this.ui = null
        // spawn a short burst of obstacles so the game stays lively
      }
      return
    }
    // keyboard 1-4 / A-D
    const q = ui.q
    for (let i = 0; i < q.choices.length; i++) {
      const key = String(i + 1)
      if (input.just(key)) { this.submitAnswer(input, i); return }
    }
    // pointer
    if (input.pointerJustPressed) {
      const mx = input.pointerX
      const my = input.pointerY
      for (let i = 0; i < ui.rects.length; i++) {
        const r = ui.rects[i]
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
          this.submitAnswer(input, i)
          return
        }
      }
    }
  }

  // ── render ──
  render(r: Renderer, ctx: EngineContext): void {
    const bgT = hexToRgb(this.def.visuals.bgTop)
    const bgB = hexToRgb(this.def.visuals.bgBottom)

    // screen shake
    const shx = this.shake > 0 ? rand(-6, 6) * this.shake : 0
    const shy = this.shake > 0 ? rand(-6, 6) * this.shake : 0
    r.cameraX = shx
    r.cameraY = shy
    r.drawGradientRect(-20, -20, ctx.width + 40, ctx.height + 40, bgT, bgB)

    const road = hexToRgb(this.def.visuals.road)
    // grass sides
    r.drawRect(0, 0, this.roadLeft, ctx.height, 34 / 255, 74 / 255, 46 / 255, 1)
    r.drawRect(this.roadLeft + this.roadWidth, 0, ctx.width, ctx.height, 34 / 255, 74 / 255, 46 / 255, 1)
    // road
    r.drawRect(this.roadLeft, 0, this.roadWidth, ctx.height, road[0] / 255, road[1] / 255, road[2] / 255, 1)
    // lane divider dashes
    r.drawRect(this.roadLeft, 0, 3, ctx.height, 1, 1, 1, 0.06)
    r.drawRect(this.roadLeft + this.roadWidth - 3, 0, 3, ctx.height, 1, 1, 1, 0.06)
    const dashH = 46
    const dashGap = 40
    const total = dashH + dashGap
    const offset = wrap(this.distance, total)
    for (let lane = 1; lane < this.lanes; lane++) {
      const x = this.roadLeft + lane * this.laneWidth
      let y = -dashH + offset
      while (y < ctx.height) {
        r.drawRect(x - 3, y, 6, dashH, 250 / 255, 204 / 255, 21 / 255, 0.5)
        y += total
      }
    }

    // coins
    for (const c of this.liveC) {
      const x = this.laneX(c.lane)
      const pulse = 1 + Math.sin(c.spin) * 0.15
      r.drawSprite('coin', x, c.y, 40 * pulse, 40 * pulse)
    }
    // obstacles
    for (const o of this.liveO) {
      const x = this.laneX(o.lane)
      r.drawSprite('obstacle', x, o.y, 52, 52)
    }

    // boost flame particles behind car
    if (this.speedBoost > 0) {
      r.drawSprite('spark', this.playerX, this.playerY + 34, 34, 40)
    }
    // player car
    r.drawSprite('car', this.playerX, this.playerY, 54, 82, 0, [1, 1, 1, 1])

    // particles
    for (const p of this.liveP) {
      const a = clamp(p.life / p.maxLife, 0, 1)
      r.drawSprite('spark', p.x, p.y, p.size, p.size, 0, [1, 1, 1, a])
    }

    // HUD
    this.renderHUD(r, ctx)

    if (this.state === 'question' && this.ui) {
      this.renderQuestion(r, ctx)
    }

    // reset camera
    r.cameraX = 0
    r.cameraY = 0
  }

  private laneX(lane: number): number {
    return this.roadLeft + lane * this.laneWidth + this.laneWidth / 2
  }

  private renderHUD(r: Renderer, ctx: EngineContext): void {
    const pad = 18
    r.drawText('SCORE', pad, 34, 14, [1, 1, 1, 0.7])
    r.drawText(String(Math.round(this.score)), pad, 68, 34, [1, 1, 1, 1])

    // coins
    const coinW = r.textWidth(String(this.coins), 24)
    r.drawSprite('coin', pad + 12, 108, 26, 26)
    r.drawText(String(this.coins), pad + 30, 108, 24, [250 / 255, 204 / 255, 21 / 255, 1])

    // hearts (top center)
    const hw = r.textWidth('0', 14)
    let hx = ctx.width / 2
    for (let i = 0; i < Math.max(0, Math.min(this.hearts, 5)); i++) {
      r.drawSprite('heart', hx, 34, 30, 30)
      hx += 34
    }
    // streak
    if (this.streak >= 2) {
      const s = 'x' + String(this.streak)
      r.drawText(s, ctx.width / 2 - r.textWidth(s, 18) / 2, 64, 18, [250 / 255, 204 / 255, 21 / 255, 1])
    }

    // timer (top right)
    if (this.overType === 'timer') {
      const t = Math.max(0, Math.ceil(this.timer - this.elapsed))
      r.drawText(String(t), ctx.width - pad - r.textWidth(String(t), 30), 50, 30, [1, 1, 1, 1])
    }
    // distance (bottom left)
    const dText = Math.round(this.distance) + 'm'
    r.drawText(dText, ctx.width / 2 - r.textWidth(dText, 16) / 2, ctx.height - 26, 16, [1, 1, 1, 0.7])
  }

  private renderQuestion(r: Renderer, ctx: EngineContext): void {
    const ui = this.ui!
    // dim overlay over the road
    r.drawRect(this.roadLeft, 0, this.roadWidth, ctx.height, 0, 0, 0, 0.35)
    // panel
    const q = ui.q
    const size = 24
    const maxW = this.roadWidth - 60
    const lines = wrapText(r, q.text, size, maxW)
    const textH = lines.length * (size + 6)
    let ty = 90
    r.drawText(`QUESTION ${ui.questionIndex + 1}`, ctx.width / 2 - r.textWidth('QUESTION X', 16) / 2, 60, 16, [250 / 255, 204 / 255, 21 / 255, 1])
    for (const line of lines) {
      r.drawText(line, ctx.width / 2 - r.textWidth(line, size) / 2, ty, size, [1, 1, 1, 1])
      ty += size + 6
    }

    // choice buttons
    const accent = hexToRgb(this.def.visuals.accent)
    for (let i = 0; i < ui.rects.length; i++) {
      const b = ui.rects[i]
      let bg: [number, number, number, number] = [1, 1, 1, 0.16]
      if (ui.answered) {
        if (i === q.correctIdx) bg = [34 / 255, 197 / 255, 94 / 255, 0.9]
        else if (ui.chosenCorrect === false && i !== q.correctIdx) bg = [1, 0.2, 0.3, 0.6]
      }
      r.drawRect(b.x, b.y, b.w, b.h, bg[0], bg[1], bg[2], bg[3])
      // border
      r.drawRect(b.x, b.y, b.w, 3, accent[0] / 255, accent[1] / 255, accent[2] / 255, 1)
      r.drawRect(b.x, b.y + b.h - 3, b.w, 3, accent[0] / 255, accent[1] / 255, accent[2] / 255, 1)
      // letter badge
      const letter = String.fromCharCode(65 + i)
      r.drawRect(b.x + 12, b.y + b.h / 2 - 16, 32, 32, accent[0] / 255, accent[1] / 255, accent[2] / 255, 1)
      r.drawText(letter, b.x + 28 - r.textWidth(letter, 16) / 2, b.y + b.h / 2, 16, [0.08, 0.1, 0.15, 1])
      r.drawText(q.choices[i], b.x + 56, b.y + b.h / 2, 22, [1, 1, 1, 1])
    }
  }
}

// ── Skeleton definition ──
const racerMeta: SkeletonMeta = {
  id: 'racer',
  name: 'Racer',
  icon: '🏎️',
  description: 'Steer your car, dodge cones, and answer questions to boost!',
  settings: [
    { key: 'lanes', label: 'Lanes', kind: 'select', options: ['2', '3', '4'], default: 3 },
    { key: 'speed', label: 'Base speed', kind: 'number', range: [120, 420, 10, 220], default: 220, hint: 'Slowest cruising speed' },
    { key: 'maxSpeed', label: 'Boost speed', kind: 'number', range: [240, 640, 10, 460], default: 460 },
    { key: 'obstacleRate', label: 'Cone density', kind: 'number', range: [0.3, 2, 0.1, 1], default: 1 },
    { key: 'coinRate', label: 'Coin density', kind: 'number', range: [0.2, 2, 0.1, 0.8], default: 0.8 },
    { key: 'questionInterval', label: 'Question every', kind: 'number', range: [3, 12, 1, 6], default: 6 },
    { key: 'shake', label: 'Screen shake', kind: 'boolean', default: true },
  ],
  defaults: {
    skeleton: 'racer',
    difficulty: 'easy',
    settings: {
      lanes: 3,
      speed: 220,
      maxSpeed: 460,
      obstacleRate: 1,
      coinRate: 0.8,
      questionInterval: 6,
      shake: true,
    },
    visuals: { bgTop: '#38bdf8', bgBottom: '#0e7490', accent: '#facc15', road: '#1e293b' },
    scoring: { basePerCorrect: 100, streakBonus: 25, coinPerCorrect: 5 },
    gameOver: { type: 'hearts', value: 3 },
  },
}

export const racerSkeleton: Skeleton = {
  meta: racerMeta,
  create(def, questions, hooks) {
    return new RacerGame(def, questions, hooks)
  },
}
