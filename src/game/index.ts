// ─── game/index.ts ───────────────────────────────────────────────────────────
// Public API of the GameForge game engine. Everything outside this barrel file
// is internal.

// engine core
export { GameEngine, FIXED_STEP } from './core/engine'
export type { EngineModule, EngineContext, EngineOptions } from './core/engine'
export { createRenderer, webgl2Available } from './core/renderer'
export type { Renderer, RendererKind, RendererOptions } from './core/renderer'
export { buildAtlas } from './core/atlas'
export type { Atlas, Rect, FontAtlas } from './core/atlas'
export { Input } from './core/input'
export { Audio } from './core/audio'
export { Pool } from './core/pool'
export { clamp, clamp01, lerp, damp, rand, randInt, TAU } from './core/math'

// modes
export { registerSkeleton, getSkeleton, getAllSkeletons, buildModeModule, createModeDefinition, validateModeDefinition } from './modes/runtime'
export type { Skeleton } from './modes/runtime'
export type {
  ModeDefinition,
  ModeHooks,
  GameResult,
  QuestionData,
  SkeletonId,
  SkeletonMeta,
  SettingSpec,
  GameOverType,
} from './modes/types'

// built-in skeleton (the racer)
export { racerSkeleton } from './modes/racer/racer'
import { registerSkeleton } from './modes/runtime'
import { racerSkeleton } from './modes/racer/racer'
// Auto-register built-in skeletons so consumers can build modes immediately.
registerSkeleton(racerSkeleton)

// data-defined example modes (what the visual editor would produce)
export { makeCasualCruiser, makeTurboRush, makeSprint } from './modes/racer/visual'

// integration helper for the Next.js app
export { GameCanvas } from './integrations/GameCanvas'
