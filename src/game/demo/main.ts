// ─── demo/main.ts ────────────────────────────────────────────────────────────
// A self-contained, zero-dependency demo that boots the engine on a canvas.
// Bundled into a single offline-friendly HTML file by scripts/build-demo.mjs.
// It lets you pick a data-defined mode, play, and see results — proof that the
// engine is standalone (no React needed) and runs fast on a Chromebook.

import { GameEngine } from '../core/engine'
import { buildAtlas } from '../core/atlas'
import { createRenderer, webgl2Available } from '../core/renderer'
import { Audio } from '../core/audio'
import { buildModeModule } from '../modes/runtime'
import { ModeDefinition, QuestionData, GameResult } from '../modes/types'
import { makeCasualCruiser, makeTurboRush, makeSprint } from '../modes/racer/visual'

const QUESTIONS: QuestionData[] = [
  { text: 'How many wheels do 2 cars have?', choices: ['6', '8', '10', '4'], correctIdx: 1 },
  { text: 'What is the chemical symbol for water?', choices: ['H2O', 'O2', 'CO2', 'NaCl'], correctIdx: 0 },
  { text: 'Which planet is closest to the Sun?', choices: ['Earth', 'Venus', 'Mercury', 'Mars'], correctIdx: 2 },
  { text: 'What is 7 x 8?', choices: ['54', '56', '64', '48'], correctIdx: 1 },
  { text: 'Which ocean is the largest?', choices: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctIdx: 3 },
  { text: 'How many sides does a hexagon have?', choices: ['5', '6', '7', '8'], correctIdx: 1 },
  { text: 'What gas do plants absorb?', choices: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], correctIdx: 1 },
  { text: 'What is the capital of France?', choices: ['Berlin', 'Madrid', 'Paris', 'Rome'], correctIdx: 2 },
]

const MODES: Record<string, () => ModeDefinition> = {
  'Casual Cruiser': makeCasualCruiser,
  'Turbo Rush': makeTurboRush,
  'Sprint Finish': makeSprint,
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, parent: HTMLElement, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag)
  if (text !== undefined) n.textContent = text
  if (className) n.className = className
  parent.appendChild(n)
  return n
}

const root = document.body
root.style.cssText = 'margin:0;height:100%;overflow:hidden;background:#0b1220;font-family:system-ui,sans-serif;color:#fff;touch-action:none;user-select:none;'

// status line (renderer / quality info)
const status = el('div', root, '', 'status')
status.style.cssText = 'position:fixed;top:8px;left:10px;z-index:50;font:11px monospace;opacity:.7'

// canvas
const canvas = document.createElement('canvas')
canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none;'
root.appendChild(canvas)

// menu overlay
const menu = el('div', root, '', 'menu')
menu.style.cssText = 'position:fixed;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:linear-gradient(160deg,#0ea5e9,#0e7490);'
el('h1', menu, 'GameForge Engine Demo', 'title').style.cssText = 'font-size:30px;font-weight:800;text-shadow:0 2px 0 rgba(0,0,0,.35)'
el('p', menu, 'Built-in optimized engine · WebGL2 with Canvas2D fallback · choose a mode below').style.cssText = 'font-size:14px;opacity:.9'
const modeRow = el('div', menu, '', 'row')
modeRow.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center'
let selectedMode: ModeDefinition = makeTurboRush()
for (const [name, fn] of Object.entries(MODES)) {
  const b = el('button', modeRow, name, 'mbtn')
  b.style.cssText = 'font-size:16px;font-weight:700;padding:12px 20px;border-radius:12px;border:2px solid #0f172a;cursor:pointer;background:#fff;color:#0f172a;box-shadow:0 3px 0 #0f172a'
  b.onclick = () => {
    selectedMode = fn()
    for (const s of modeRow.children) (s as HTMLElement).style.background = '#fff'
    b.style.background = '#facc15'
  }
  b.style.background = name === 'Turbo Rush' ? '#facc15' : '#fff'
}
const startBtn = el('button', menu, '▶ START RACE', 'start')
startBtn.style.cssText = 'font-size:20px;font-weight:800;padding:14px 44px;border-radius:14px;border:none;cursor:pointer;background:#facc15;color:#0f172a;box-shadow:0 4px 0 #92400e'

// game-over overlay
const over = el('div', root, '', 'over')
over.style.cssText = 'position:fixed;inset:0;z-index:30;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(10,15,30,.7);backdrop-filter:blur(2px)'
const overTitle = el('h2', over, 'GAME OVER', 'ot')
overTitle.style.cssText = 'font-size:32px;font-weight:800'
const overStats = el('div', over, '', 'ostats')
overStats.style.cssText = 'text-align:center;font-size:15px;line-height:1.8'
const againBtn = el('button', over, '↻ Play Again', 'again')
againBtn.style.cssText = 'font-size:16px;font-weight:700;padding:10px 26px;border-radius:12px;border:none;cursor:pointer;background:#22c55e;color:#052e16'

let engine: GameEngine | null = null
const audio = new Audio()

function boot(mode: ModeDefinition): void {
  audio.unlock()
  const atlas = buildAtlas()
  const renderer = createRenderer(canvas, atlas, {})
  const module = buildModeModule(mode, QUESTIONS, {
    onScore: () => {},
    onGameOver: (r: GameResult) => showOver(r),
  })
  engine = new GameEngine(canvas, renderer, { module })
  status.textContent = `renderer: ${renderer.kind} · webgl2:${webgl2Available()} · res:${canvas.width}x${canvas.height}`
  window.addEventListener('resize', () => engine!.resize(window.innerWidth, window.innerHeight))
  engine.resize(window.innerWidth, window.innerHeight)
  engine.start()
}

function showOver(r: GameResult): void {
  overStats.textContent =
    `Score  ${r.score}\nCorrect  ${r.correct} / ${r.correct + r.wrong}\nBest streak  x${r.bestStreak}\nCoins  ${r.coins}\nDistance  ${r.distance}m`
  over.style.display = 'flex'
}

function startGame(): void {
  over.style.display = 'none'
  menu.style.display = 'none'
  if (engine) { engine.destroy(); engine = null }
  boot(selectedMode)
}

startBtn.onclick = startGame
againBtn.onclick = startGame

// keyboard: Enter on menu starts, Enter on game-over replays
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (menu.style.display !== 'none') startGame()
    else if (over.style.display === 'flex') startGame()
  }
})
