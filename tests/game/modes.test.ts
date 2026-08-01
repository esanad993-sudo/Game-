import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GameEngine } from '../../src/game/core/engine'
import { registerSkeleton, buildModeModule, createModeDefinition, validateModeDefinition, getAllSkeletons } from '../../src/game/modes/runtime'
import { racerSkeleton } from '../../src/game/modes/racer/racer'
import { makeTurboRush } from '../../src/game/modes/racer/visual'
import { QuestionData } from '../../src/game/modes/types'
import { makeNullRenderer, makeCanvasStub } from './helpers'

registerSkeleton(racerSkeleton)

const QS: QuestionData[] = [
  { text: '2 + 2?', choices: ['3', '4', '5'], correctIdx: 1 },
  { text: 'Capital of France?', choices: ['Paris', 'Lyon', 'Marseille'], correctIdx: 0 },
  { text: 'H2O is?', choices: ['Salt', 'Water', 'Iron'], correctIdx: 1 },
]

interface RacerLike {
  state: string
  score: number
  coins: number
  correct: number
  wrong: number
  bestStreak: number
  hearts: number
  currentSpeed: number
  speed: number
  maxSpeed: number
  distance: number
  ui: { q: { correctIdx: number } } | null
}

/** One fixed step + end-of-frame bookkeeping (mimics the real loop). */
function stepFrame(engine: GameEngine): void {
  engine.step()
  engine.input.endFrame()
}

function makeEngine(definition: Parameters<typeof buildModeModule>[0]) {
  const { renderer } = makeNullRenderer()
  const canvas = makeCanvasStub()
  const module = buildModeModule(definition, QS, {}) as unknown as RacerLike
  const engine = new GameEngine(canvas, renderer, { module: module as never, width: 800, height: 600 })
  return { engine, module }
}

/** Step until a question is pending, then answer it (correctly by default). */
function answerNextQuestion(engine: GameEngine, module: RacerLike, correct = true): void {
  let guard = 0
  while (module.state !== 'question' && guard++ < 2000) stepFrame(engine)
  assert.equal(module.state, 'question', 'expected a question to trigger')
  const key = correct ? String(module.ui!.q.correctIdx + 1) : '1'
  engine.input.press(key)
  stepFrame(engine)
  // drain the 0.9s feedback + resume to 'playing'
  for (let i = 0; i < 120; i++) stepFrame(engine)
}

test('validates a good and a bad definition', () => {
  assert.deepEqual(validateModeDefinition(makeTurboRush()), [])
  const bad = createModeDefinition('racer', { name: '' })
  assert.ok(validateModeDefinition(bad).some((e) => /name/.test(e)))
})

test('engine steps at a fixed timestep deterministically', () => {
  const { engine, module } = makeEngine(makeTurboRush())
  engine.advance(1)
  assert.ok(module.distance > 0, 'car should have moved')
  assert.ok(module.currentSpeed > 0, 'car should be moving')
  engine.destroy()
})

test('answering correctly boosts speed and grants score + streak', () => {
  const { engine, module } = makeEngine(makeTurboRush())
  answerNextQuestion(engine, module)
  assert.ok(module.correct >= 1, 'one question answered correctly')
  assert.ok(module.score > 0, 'score increased')
  assert.ok(module.bestStreak >= 1, 'streak recorded')
  assert.equal(module.wrong, 0)
  engine.destroy()
})

test('answering wrongly records a miss and does not boost', () => {
  const { engine, module } = makeEngine(makeTurboRush())
  const scoreBefore = module.score
  answerNextQuestion(engine, module, false)
  assert.ok(module.wrong >= 1, 'wrong answer counted')
  assert.equal(module.correct, 0)
  assert.equal(module.score, scoreBefore, 'no score for a wrong answer')
  engine.destroy()
})

test('game over triggers when hearts run out', () => {
  const def = makeTurboRush()
  def.gameOver = { type: 'hearts', value: 1 }
  def.settings.obstacleRate = 10 // lots of cones
  const { engine, module } = makeEngine(def)
  let guard = 0
  while (module.state !== 'gameover' && guard++ < 5000) stepFrame(engine)
  assert.equal(module.state, 'gameover')
  assert.ok(module.hearts <= 0)
  engine.destroy()
})

test('timer mode ends the run', () => {
  const def = makeTurboRush()
  def.gameOver = { type: 'timer', value: 1 }
  def.settings.questionInterval = 60 // avoid questions; pure timer
  const { engine, module } = makeEngine(def)
  engine.advance(1.2)
  assert.equal(module.state, 'gameover')
  engine.destroy()
})

test('hooks report game over with a result', () => {
  let result: any = null
  const def = makeTurboRush()
  def.gameOver = { type: 'timer', value: 1 }
  def.settings.questionInterval = 60
  const { renderer } = makeNullRenderer()
  const canvas = makeCanvasStub()
  const module = buildModeModule(def, QS, { onGameOver: (r) => (result = r) }) as never
  const engine = new GameEngine(canvas, renderer, { module, width: 800, height: 600 })
  engine.advance(1.2)
  assert.ok(result, 'onGameOver fired')
  assert.equal(typeof result.score, 'number')
  assert.ok(result.duration >= 1)
  engine.destroy()
})

test('mode registry exposes skeletons', () => {
  assert.ok(getAllSkeletons().some((m) => m.id === 'racer'))
})
