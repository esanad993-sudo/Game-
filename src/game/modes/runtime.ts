// ─── modes/runtime.ts ────────────────────────────────────────────────────────
// The mode registry + runtime. A Skeleton turns a ModeDefinition (data) into a
// playable EngineModule. Registering a new skeleton is how you add a brand-new
// game genre in code; defining a ModeDefinition on top of an existing skeleton
// is how teachers/students create a mode without writing any code.

import { EngineModule } from '../core/engine'
import { ModeDefinition, ModeHooks, QuestionData, SkeletonId, SkeletonMeta } from './types'

export interface Skeleton {
  meta: SkeletonMeta
  create(def: ModeDefinition, questions: QuestionData[], hooks: ModeHooks): EngineModule
}

const registry = new Map<SkeletonId, Skeleton>()

export function registerSkeleton(skeleton: Skeleton): void {
  registry.set(skeleton.meta.id, skeleton)
}

export function getSkeleton(id: SkeletonId): Skeleton | undefined {
  return registry.get(id)
}

export function getAllSkeletons(): SkeletonMeta[] {
  return Array.from(registry.values()).map((s) => s.meta)
}

/** Build a fully-valid ModeDefinition with defaults + required identity fields. */
export function createModeDefinition(
  skeletonId: SkeletonId,
  partial: Partial<ModeDefinition>,
): ModeDefinition {
  const skeleton = getSkeleton(skeletonId)
  if (!skeleton) throw new Error(`Unknown skeleton: ${skeletonId}`)
  const d = skeleton.meta.defaults
  const def: ModeDefinition = {
    id: partial.id ?? `${skeletonId}_${Date.now()}`,
    name: partial.name ?? 'Untitled Mode',
    icon: partial.icon ?? skeleton.meta.icon,
    description: partial.description ?? '',
    skeleton: skeletonId,
    difficulty: partial.difficulty ?? d.difficulty,
    settings: { ...d.settings, ...(partial.settings ?? {}) },
    visuals: { ...d.visuals, ...(partial.visuals ?? {}) },
    scoring: { ...d.scoring, ...(partial.scoring ?? {}) },
    gameOver: { ...d.gameOver, ...(partial.gameOver ?? {}) },
  }
  return def
}

/**
 * Validate a definition against its skeleton's setting specs. Returns a list of
 * problems (empty = valid). Used by the editor before saving.
 */
export function validateModeDefinition(def: ModeDefinition): string[] {
  const skeleton = getSkeleton(def.skeleton)
  if (!skeleton) return [`Unknown skeleton "${def.skeleton}"`]
  const errors: string[] = []
  if (!def.id.trim()) errors.push('Mode needs an id.')
  if (!def.name.trim()) errors.push('Mode needs a name.')
  for (const spec of skeleton.meta.settings) {
    const v = def.settings[spec.key]
    if (v === undefined) {
      errors.push(`Missing setting "${spec.key}".`)
      continue
    }
    if (spec.kind === 'number' && spec.range && typeof v === 'number') {
      const [min, max] = spec.range
      if (v < min || v > max) errors.push(`"${spec.label}" must be ${min}–${max}.`)
    }
  }
  if (def.gameOver.value <= 0) errors.push('Game-over value must be positive.')
  return errors
}

/**
 * Instantiate a playable module from a definition. This is the single entry
 * point used by both code-created and visually-created modes.
 */
export function buildModeModule(def: ModeDefinition, questions: QuestionData[], hooks: ModeHooks = {}): EngineModule {
  const skeleton = getSkeleton(def.skeleton)
  if (!skeleton) throw new Error(`No skeleton registered for "${def.skeleton}"`)
  if (questions.length === 0) throw new Error('A game needs at least one question.')
  return skeleton.create(def, questions, hooks)
}
