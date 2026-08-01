// Game mode types
export type GameModeId = 'classic' | 'racing'

export interface GameModeConfig {
  id: GameModeId
  name: string
  description: string
  icon: string          // emoji
  color: string         // tailwind color class
  playerCount: { min: number; max: number }
  hasTimer: boolean
  hasPowerUps: boolean
  isTeamMode: boolean
  difficulty: 'easy' | 'medium' | 'hard'
  thumbnail: string     // emoji or image URL
}

export interface GameModeState {
  modeId: GameModeId
  status: 'setup' | 'playing' | 'paused' | 'ended'
  questions: Question[]
  currentQuestionIndex: number
  score: number
  correct: number
  wrong: number
  streak: number
  coins: number
  timeRemaining: number | null
  powerUps: PowerUp[]
  // Mode-specific state (e.g., HP for battle royale)
  modeData: Record<string, any>
}

export interface PowerUp {
  id: string
  name: string
  icon: string
  description: string
  quantity: number
}

export interface Question {
  id: string
  text: string
  choices: string[]
  correctIdx: number
  explanation?: string
  order: number
}

export interface GameModeResult {
  modeId: GameModeId
  score: number
  correct: number
  wrong: number
  bestStreak: number
  coinsEarned: number
  duration: number
  modeData: Record<string, any>
}
