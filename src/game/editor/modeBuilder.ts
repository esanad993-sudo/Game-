// ─── editor/modeBuilder.ts ───────────────────────────────────────────────────
// Pure, framework-agnostic logic for the visual mode editor. It turns skeleton
// metadata + user edits into a valid ModeDefinition. Kept free of React/DOM so
// it can be unit-tested headlessly and reused by any UI.
//
// This is the heart of "students and teachers create game modes": the editor UI
// only maps form inputs through these functions — no game code is written.

import {
  createModeDefinition,
  getSkeleton,
  getAllSkeletons,
  validateModeDefinition,
} from '../modes/runtime'
import type { ModeDefinition, SkeletonId, SettingSpec } from '../modes/types'

export interface IconOption { emoji: string; label: string }

/** Curated emoji choices for a mode's icon (avoids arbitrary text input). */
export const ICON_OPTIONS: IconOption[] = [
  { emoji: '🏎️', label: 'Racer' },
  { emoji: '🚗', label: 'Car' },
  { emoji: '🏁', label: 'Finish flag' },
  { emoji: '🎽', label: 'Sprint' },
  { emoji: '🏆', label: 'Trophy' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '🌊', label: 'Ocean' },
  { emoji: '🌲', label: 'Forest' },
  { emoji: '☀️', label: 'Sunny' },
  { emoji: '🌙', label: 'Night' },
]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export interface GameOverOption { type: ModeDefinition['gameOver']['type']; label: string; hint: string }

export const GAME_OVER_OPTIONS: GameOverOption[] = [
  { type: 'hearts', label: 'Lose all hearts', hint: 'value = starting hearts' },
  { type: 'timer', label: 'Time limit', hint: 'value = seconds' },
  { type: 'distance', label: 'Reach distance', hint: 'value = meters to the finish' },
  { type: 'questions', label: 'Answer N questions', hint: 'value = number of questions' },
]

/** A draft mode currently being edited. */
export type Draft = ModeDefinition

/** Skeleton options for the picker. */
export function listSkeletons() {
  return getAllSkeletons()
}

/** Start a fresh draft from a skeleton's defaults. */
/** Unique id suffix (keeps drafts/saves from colliding within the same ms). */
let idCounter = 0
export function nextDraftId(skeletonId: SkeletonId): string {
  idCounter = (idCounter + 1) % 1e6
  return `${skeletonId}_${Date.now().toString(36)}_${idCounter.toString(36)}`
}

export function createDraft(skeletonId: SkeletonId): Draft {
  const skeleton = getSkeleton(skeletonId)
  if (!skeleton) throw new Error(`Unknown skeleton "${skeletonId}"`)
  return createModeDefinition(skeletonId, {
    id: nextDraftId(skeletonId),
    name: `New ${skeleton.meta.name}`,
    icon: skeleton.meta.icon,
  })
}

/** Switch a draft to a different skeleton (resets settings to that skeleton). */
export function changeSkeleton(draft: Draft, skeletonId: SkeletonId): Draft {
  return createModeDefinition(skeletonId, {
    name: draft.name,
    icon: draft.icon,
    description: draft.description,
  })
}

/** Set a raw user value on a setting, coercing + clamping per its spec. */
export function applySetting(draft: Draft, key: string, raw: number | string | boolean): Draft {
  const skeleton = getSkeleton(draft.skeleton)
  const spec = skeleton?.meta.settings.find((s) => s.key === key)
  let value = raw
  if (spec?.kind === 'number' && typeof raw === 'number' && spec.range) {
    const [min, max, step] = spec.range
    const snapped = min + Math.round((raw - min) / step) * step
    const clamped = Math.min(max, Math.max(min, snapped))
    const decimals = Math.max(0, Math.ceil(-Math.log10(step)))
    const f = 10 ** decimals
    value = Math.round(clamped * f) / f
  }
  if (spec?.kind === 'boolean') value = !!raw
  if (spec?.kind === 'select' && spec.options && !spec.options.includes(String(raw))) {
    value = Number(spec.options[0])
  }
  return { ...draft, settings: { ...draft.settings, [key]: value } }
}

/** Set a basic identity field. */
export function applyMeta(draft: Draft, field: 'name' | 'icon' | 'description' | 'difficulty', value: string): Draft {
  return { ...draft, [field]: value }
}

/** Set a visual color. */
export function applyVisual(draft: Draft, key: keyof ModeDefinition['visuals'], hex: string): Draft {
  return { ...draft, visuals: { ...draft.visuals, [key]: hex } }
}

/** Set a scoring value. */
export function applyScoring(draft: Draft, key: keyof ModeDefinition['scoring'], value: number): Draft {
  return { ...draft, scoring: { ...draft.scoring, [key]: Math.max(0, Math.round(value)) } }
}

/** Set the game-over rule. */
export function applyGameOver(draft: Draft, partial: Partial<ModeDefinition['gameOver']>): Draft {
  return { ...draft, gameOver: { ...draft.gameOver, ...partial } }
}

/** All the setting specs for the current skeleton (drives the form). */
export function settingsFor(draft: Draft): SettingSpec[] {
  return getSkeleton(draft.skeleton)?.meta.settings ?? []
}

/** Validate a draft; returns errors (empty = ready to save). */
export function validate(draft: Draft): string[] {
  return validateModeDefinition(draft)
}

/** Build a human-readable summary string of a game-over rule. */
export function describeGameOver(draft: Draft): string {
  const opt = GAME_OVER_OPTIONS.find((o) => o.type === draft.gameOver.type)
  const label = opt ? opt.label : draft.gameOver.type
  return `${label} (${draft.gameOver.value})`
}
