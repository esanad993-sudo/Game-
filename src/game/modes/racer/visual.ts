// ─── modes/racer/visual.ts ───────────────────────────────────────────────────
// EXAMPLES of teacher/student-created modes built purely as DATA. Each is a
// ModeDefinition on top of the "racer" skeleton — no code. This is exactly the
// shape the visual mode editor produces and saves (e.g. as a DB row / JSON).

import { createModeDefinition } from '../runtime'
import { ModeDefinition } from '../types'

/** Easy, slow, forgiving — good for younger grades. */
export function makeCasualCruiser(): ModeDefinition {
  return createModeDefinition('racer', {
    id: 'racer_casual',
    name: 'Casual Cruiser',
    icon: '🚗',
    description: 'Easy-paced cruising with plenty of time to answer.',
    difficulty: 'easy',
    settings: { lanes: 3, speed: 180, maxSpeed: 380, obstacleRate: 0.6, coinRate: 1, questionInterval: 8 },
    visuals: { bgTop: '#86efac', bgBottom: '#15803d', accent: '#22c55e', road: '#1e293b' },
    gameOver: { type: 'hearts', value: 5 },
  })
}

/** Fast, tight — for review races before a test. */
export function makeTurboRush(): ModeDefinition {
  return createModeDefinition('racer', {
    id: 'racer_turbo',
    name: 'Turbo Rush',
    icon: '🏁',
    description: 'Full throttle. Answer fast or the cones will get you!',
    difficulty: 'hard',
    settings: { lanes: 4, speed: 320, maxSpeed: 600, obstacleRate: 1.6, coinRate: 0.5, questionInterval: 5 },
    visuals: { bgTop: '#f472b6', bgBottom: '#7e22ce', accent: '#facc15', road: '#0f172a' },
    gameOver: { type: 'timer', value: 120 },
  })
}

/** Sprint to a finish line instead of survival. */
export function makeSprint(): ModeDefinition {
  return createModeDefinition('racer', {
    id: 'racer_sprint',
    name: 'Sprint Finish',
    icon: '🎽',
    description: 'Race a set distance — every question gets you closer to the flag.',
    difficulty: 'medium',
    settings: { lanes: 3, speed: 260, maxSpeed: 520, obstacleRate: 1.1, coinRate: 0.7, questionInterval: 6 },
    visuals: { bgTop: '#fde047', bgBottom: '#ea580c', accent: '#f43f5e', road: '#292524' },
    scoring: { basePerCorrect: 150, streakBonus: 40, coinPerCorrect: 8 },
    gameOver: { type: 'distance', value: 1500 },
  })
}
