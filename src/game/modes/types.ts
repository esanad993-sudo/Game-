// ─── modes/types.ts ──────────────────────────────────────────────────────────
// The data model for GAME MODES. A "mode" is plain data (a ModeDefinition),
// not code. That's what lets teachers & students create modes through a visual
// editor and lets the same runtime play any of them. Advanced/custom modes can
// still be dropped in as code by registering a new Skeleton.

/** Which rule-set ("skeleton") a mode is built on. Extend as you add games. */
export type SkeletonId = 'racer'

/** How a run ends. */
export type GameOverType = 'hearts' | 'timer' | 'distance' | 'questions'

export interface QuestionData {
  text: string
  choices: string[]
  correctIdx: number
}

/** A fully-described game mode — this is what the visual editor produces. */
export interface ModeDefinition {
  id: string
  name: string
  icon: string
  description: string
  skeleton: SkeletonId
  difficulty: 'easy' | 'medium' | 'hard'
  /** Skeleton-specific tuning values (validated per skeleton). */
  settings: Record<string, number | string | boolean>
  visuals: {
    /** Sky/background gradient (CSS hex). */
    bgTop: string
    bgBottom: string
    accent: string
    road: string
  }
  scoring: {
    basePerCorrect: number
    streakBonus: number
    coinPerCorrect: number
  }
  gameOver: {
    type: GameOverType
    /** Meaning depends on type: heart count, seconds, distance, or questions. */
    value: number
  }
}

/** A scalar that the visual editor can present as a slider / toggle. */
export interface SettingSpec {
  key: string
  label: string
  kind: 'number' | 'boolean' | 'select'
  /** number: [min, max, step, default]. */
  range?: [number, number, number, number]
  options?: string[]
  default: number | string | boolean
  hint?: string
}

/** Metadata a skeleton exposes so the editor can build its form. */
export interface SkeletonMeta {
  id: SkeletonId
  name: string
  icon: string
  description: string
  /** The settings a non-programmer can tune in the visual editor. */
  settings: SettingSpec[]
  /** Defaults the skeleton starts from. */
  defaults: Omit<ModeDefinition, 'id' | 'name' | 'icon' | 'description'>
}

/** Events the runtime emits to the host app (UI overlays, persistence). */
export interface ModeHooks {
  onScore?(score: number): void
  onCoins?(coins: number): void
  onGameOver?(result: GameResult): void
}

export interface GameResult {
  score: number
  correct: number
  wrong: number
  bestStreak: number
  coins: number
  distance: number
  duration: number
}
