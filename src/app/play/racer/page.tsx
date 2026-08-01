'use client'
// ─── /play/racer ─────────────────────────────────────────────────────────────
// Example of wiring the optimized engine into the Next.js app (hybrid
// integration). The <GameCanvas> component mounts the engine on a canvas; React
// only renders the out-of-band HUD/overlays so it never touches the game loop.

import { useState, useCallback } from 'react'
import { GameCanvas } from '@/game/integrations/GameCanvas'
import { makeTurboRush, makeSprint, makeCasualCruiser } from '@/game/modes/racer/visual'
import type { ModeDefinition, QuestionData, GameResult } from '@/game/modes/types'

const QUESTIONS: QuestionData[] = [
  { text: 'How many wheels do 2 cars have?', choices: ['6', '8', '10', '4'], correctIdx: 1 },
  { text: 'What is the chemical symbol for water?', choices: ['H2O', 'O2', 'CO2', 'NaCl'], correctIdx: 0 },
  { text: 'What is 7 x 8?', choices: ['54', '56', '64', '48'], correctIdx: 1 },
  { text: 'Which planet is closest to the Sun?', choices: ['Earth', 'Venus', 'Mercury', 'Mars'], correctIdx: 2 },
  { text: 'Which ocean is the largest?', choices: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctIdx: 3 },
  { text: 'What is the capital of France?', choices: ['Berlin', 'Madrid', 'Paris', 'Rome'], correctIdx: 2 },
]

const MODE_FACTORIES: Record<string, () => ModeDefinition> = {
  'Casual Cruiser': makeCasualCruiser,
  'Turbo Rush': makeTurboRush,
  'Sprint Finish': makeSprint,
}

export default function RacerPlayPage() {
  const [modeName, setModeName] = useState('Turbo Rush')
  const [result, setResult] = useState<GameResult | null>(null)
  const [runKey, setRunKey] = useState(0)

  // Rebuild the engine (new module) when the mode or run changes.
  const definition = MODE_FACTORIES[modeName]()
  const onGameOver = useCallback((r: GameResult) => setResult(r), [])

  const restart = () => {
    setResult(null)
    setRunKey((k) => k + 1)
  }

  return (
    <div className="min-h-screen gf-bg relative overflow-hidden">
      <div className="absolute inset-0">
        <GameCanvas
          key={`${modeName}-${runKey}`}
          definition={definition}
          questions={QUESTIONS}
          hooks={{ onGameOver }}
          className="w-full h-full"
        />
      </div>

      {/* Out-of-band UI (React never runs inside the game loop) */}
      <div className="absolute top-3 left-3 z-20 flex gap-2 flex-wrap max-w-[70vw]">
        {Object.keys(MODE_FACTORIES).map((name) => (
          <button
            key={name}
            onClick={() => { setModeName(name); restart() }}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all ${
              modeName === name ? 'bg-gf-warning text-gf-dark border-gf-dark' : 'bg-white/80 text-gf-dark border-gf-dark/20'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <button onClick={restart} className="absolute top-3 right-3 z-20 gf-btn gf-btn-outline text-sm">↻ Restart</button>

      {result && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="gf-card p-8 text-center max-w-sm">
            <h2 className="gf-font-display text-2xl text-gf-dark mb-4">🏁 Game Over</h2>
            <div className="grid grid-cols-2 gap-3 text-left mb-4">
              <Stat label="Score" value={String(result.score)} />
              <Stat label="Correct" value={`${result.correct} / ${result.correct + result.wrong}`} />
              <Stat label="Best streak" value={`x${result.bestStreak}`} />
              <Stat label="Coins" value={`🪙 ${result.coins}`} />
            </div>
            <button onClick={restart} className="gf-btn w-full">↻ Play Again</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-gf-light/60">
      <p className="gf-font-display text-lg text-gf-dark">{value}</p>
      <p className="text-xs text-gf-dark/60 font-bold">{label}</p>
    </div>
  )
}
