import { GameModeConfig, GameModeId } from './types'

export const GAME_MODES: Record<GameModeId, GameModeConfig> = {
  'classic': {
    id: 'classic',
    name: 'Classic Quiz',
    description: 'Fast-paced Q&A — answer correctly, earn points, climb the leaderboard!',
    icon: '📝',
    color: 'bg-gf-teal',
    playerCount: { min: 1, max: 50 },
    hasTimer: true,
    hasPowerUps: true,
    isTeamMode: false,
    difficulty: 'easy',
    thumbnail: '📝',
  },
  'racing': {
    id: 'racing',
    name: 'Speed Rush',
    description: 'Race against the clock — answer fast to boost your car and win!',
    icon: '🏎️',
    color: 'bg-gf-purple',
    playerCount: { min: 1, max: 50 },
    hasTimer: true,
    hasPowerUps: true,
    isTeamMode: false,
    difficulty: 'easy',
    thumbnail: '🏎️',
  },
  'turbo-rush': {
    id: 'turbo-rush',
    name: 'TurboRush',
    description: 'Full-throttle racing game — steer, boost, and answer questions to stay ahead of the pack!',
    icon: '🏁',
    color: 'bg-gf-warning',
    playerCount: { min: 1, max: 50 },
    hasTimer: true,
    hasPowerUps: true,
    isTeamMode: false,
    difficulty: 'easy',
    thumbnail: '🏁',
  },
}

export function getGameMode(id: GameModeId): GameModeConfig {
  return GAME_MODES[id]
}

export function getAllGameModes(): GameModeConfig[] {
  return Object.values(GAME_MODES)
}
