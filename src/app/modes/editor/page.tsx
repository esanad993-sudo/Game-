'use client'
// ─── /modes/editor ───────────────────────────────────────────────────────────
// The visual game-mode editor (engine Layer 3). Teachers & students create
// game modes here by tuning forms — no code. The form is driven by each
// skeleton's SettingSpec metadata, so new code skeletons automatically appear
// here with editable controls, and any saved mode can be played immediately.

import { useEffect, useState } from 'react'
import {
  createDraft, changeSkeleton, applyMeta, applySetting, applyVisual, applyScoring,
  applyGameOver, settingsFor, validate, listSkeletons, ICON_OPTIONS, DIFFICULTIES, GAME_OVER_OPTIONS, describeGameOver,
} from '@/game/editor/modeBuilder'
import { ModeStore } from '@/game/editor/modeStore'
import { GameCanvas } from '@/game/integrations/GameCanvas'
import type { ModeDefinition, QuestionData, SkeletonId, GameResult } from '@/game/modes/types'

const store = new ModeStore()

const SAMPLE_QUESTIONS: QuestionData[] = [
  { text: 'How many wheels do 2 cars have?', choices: ['6', '8', '10', '4'], correctIdx: 1 },
  { text: 'What is 7 x 8?', choices: ['54', '56', '64', '48'], correctIdx: 1 },
  { text: 'Which planet is closest to the Sun?', choices: ['Earth', 'Venus', 'Mercury', 'Mars'], correctIdx: 2 },
  { text: 'What is the capital of France?', choices: ['Berlin', 'Madrid', 'Paris', 'Rome'], correctIdx: 2 },
]

export default function ModeEditorPage() {
  const [modes, setModes] = useState<ModeDefinition[]>([])
  const [editing, setEditing] = useState<ModeDefinition | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [playing, setPlaying] = useState<ModeDefinition | null>(null)

  const refresh = () => setModes(store.list())

  useEffect(refresh, [])

  const startNew = (skeletonId: SkeletonId) => { setEditing(createDraft(skeletonId)); setErrors([]) }

  const save = () => {
    if (!editing) return
    const errs = validate(editing)
    setErrors(errs)
    if (errs.length > 0) return
    store.save(editing)
    setEditing(null)
    refresh()
  }

  const removeMode = (id: string) => {
    if (!confirm('Delete this mode?')) return
    store.remove(id)
    refresh()
  }

  return (
    <div className="min-h-screen gf-bg">
      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="gf-font-display text-2xl text-gf-dark">🎨 Mode Editor</h1>
            <p className="text-gf-dark/60 font-bold">Create and tune your own game modes — no code needed</p>
          </div>
          <a href="/" className="gf-btn gf-btn-outline text-sm">← Dashboard</a>
        </header>

        {editing ? (
          <EditorForm
            draft={editing}
            onChange={(d) => { setEditing(d); setErrors(validate(d)) }}
            errors={errors}
            onCancel={() => { setEditing(null); setErrors([]) }}
            onSave={save}
          />
        ) : (
          <ModeList modes={modes} onNew={startNew} onEdit={(m) => { setEditing(m); setErrors(validate(m)) }} onDelete={removeMode} onPlay={setPlaying} />
        )}
      </div>

      {playing && (
        <PlayOverlay mode={playing} questions={SAMPLE_QUESTIONS} onClose={() => setPlaying(null)} />
      )}
    </div>
  )
}

// ── Play overlay (engine runs on canvas; React only draws the overlay) ───────
function PlayOverlay({ mode, questions, onClose }: { mode: ModeDefinition; questions: QuestionData[]; onClose: () => void }) {
  const [result, setResult] = useState<GameResult | null>(null)
  const [runKey, setRunKey] = useState(0)
  const restart = () => { setResult(null); setRunKey((k) => k + 1) }

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1220]">
      <div className="absolute inset-0">
        <GameCanvas
          key={`${mode.id}-${runKey}`}
          definition={mode}
          questions={questions}
          hooks={{ onGameOver: setResult }}
          className="w-full h-full"
        />
      </div>
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <button onClick={onClose} className="gf-btn gf-btn-outline text-sm bg-white/90">✕ Close</button>
        <span className="gf-chip">{mode.icon} {mode.name}</span>
      </div>
      <button onClick={restart} className="absolute top-3 right-3 z-20 gf-btn text-sm">↻ Restart</button>

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
            <div className="flex gap-2">
              <button onClick={onClose} className="gf-btn gf-btn-outline text-sm flex-1">Done</button>
              <button onClick={restart} className="gf-btn text-sm flex-1">↻ Again</button>
            </div>
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

// ── List ─────────────────────────────────────────────────────────────────────
function ModeList({ modes, onNew, onEdit, onDelete, onPlay }: {
  modes: ModeDefinition[]
  onNew: (id: SkeletonId) => void
  onEdit: (m: ModeDefinition) => void
  onDelete: (id: string) => void
  onPlay: (m: ModeDefinition) => void
}) {
  const skeletons = listSkeletons()
  return (
    <div className="space-y-6">
      <div className="gf-card p-6">
        <h2 className="gf-font-display text-lg text-gf-dark mb-3">Create a new mode</h2>
        <p className="text-sm text-gf-dark/50 font-bold mb-3">Pick a game type (skeleton) to start:</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {skeletons.map((s) => (
            <button key={s.id} onClick={() => onNew(s.id)}
              className="p-4 rounded-xl bg-gf-light/60 border-2 border-gf-dark/10 hover:border-gf-teal text-left transition-all">
              <span className="text-3xl block mb-1">{s.icon}</span>
              <span className="font-bold text-gf-dark">{s.name}</span>
              <span className="block text-xs text-gf-dark/50 mt-1">{s.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="gf-font-display text-lg text-gf-dark mb-3">Your modes ({modes.length})</h2>
        {modes.length === 0 ? (
          <div className="gf-card p-8 text-center text-gf-dark/50 font-bold">
            No modes yet. Create your first one above! 🎨
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {modes.map((m) => (
              <div key={m.id} className="gf-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{m.icon}</span>
                    <h3 className="font-bold text-gf-dark">{m.name}</h3>
                  </div>
                  <span className="gf-chip text-xs">{m.difficulty}</span>
                </div>
                <p className="text-xs text-gf-dark/50">{m.description || '—'}</p>
                <div className="flex gap-2 mt-3 flex-wrap text-[11px] text-gf-dark/60 font-bold">
                  <span className="gf-chip">🎲 {describeGameOver(m)}</span>
                  <span className="gf-chip">💯 {m.scoring.basePerCorrect} pts</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onPlay(m)} className="gf-btn text-xs py-2 flex-1">▶ Play</button>
                  <button onClick={() => onEdit(m)} className="gf-btn gf-btn-outline text-xs py-2">✏️ Edit</button>
                  <button onClick={() => onDelete(m.id)} className="gf-btn gf-btn-red text-xs py-2">🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Editor form ──────────────────────────────────────────────────────────────
function EditorForm({ draft, onChange, errors, onCancel, onSave }: {
  draft: ModeDefinition
  onChange: (d: ModeDefinition) => void
  errors: string[]
  onCancel: () => void
  onSave: () => void
}) {
  const settings = settingsFor(draft)
  const skeletons = listSkeletons()

  const set = (key: string, v: number | string | boolean) => onChange(applySetting(draft, key, v))
  const meta = (f: 'name' | 'icon' | 'description' | 'difficulty', v: string) => onChange(applyMeta(draft, f, v))
  const visual = (k: keyof ModeDefinition['visuals'], v: string) => onChange(applyVisual(draft, k, v))
  const scoring = (k: keyof ModeDefinition['scoring'], v: number) => onChange(applyScoring(draft, k, v))
  const goType = (t: ModeDefinition['gameOver']['type']) => onChange(applyGameOver(draft, { type: t }))
  const goValue = (v: number) => onChange(applyGameOver(draft, { value: Math.max(1, Math.round(v)) }))

  return (
    <div className="space-y-5">
      <section className="gf-card p-6 space-y-4">
        <h2 className="gf-font-display text-lg text-gf-dark">1 · Basics</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <Field label="Mode name">
            <input value={draft.name} onChange={(e) => meta('name', e.target.value)} className="gf-input" placeholder="e.g. Fractions Dash" />
          </Field>
          <Field label="Skeleton (game type)">
            <select value={draft.skeleton} onChange={(e) => onChange(changeSkeleton(draft, e.target.value as SkeletonId))} className="gf-input">
              {skeletons.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Icon">
          <div className="flex gap-2 flex-wrap">
            {ICON_OPTIONS.map((o) => (
              <button key={o.emoji} type="button" title={o.label} onClick={() => meta('icon', o.emoji)}
                className={`w-10 h-10 rounded-xl text-xl border-2 transition-all ${draft.icon === o.emoji ? 'bg-gf-teal border-gf-dark' : 'bg-white border-gf-dark/15'}`}>
                {o.emoji}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid lg:grid-cols-2 gap-4">
          <Field label="Difficulty">
            <select value={draft.difficulty} onChange={(e) => meta('difficulty', e.target.value)} className="gf-input">
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <input value={draft.description} onChange={(e) => meta('description', e.target.value)} className="gf-input" placeholder="Short description" />
          </Field>
        </div>
      </section>

      <section className="gf-card p-6 space-y-4">
        <h2 className="gf-font-display text-lg text-gf-dark">2 · Gameplay tuning</h2>
        {settings.map((spec) => (
          <SettingControl key={spec.key} spec={spec} value={draft.settings[spec.key]} onChange={(v) => set(spec.key, v)} />
        ))}
      </section>

      <section className="gf-card p-6">
        <h2 className="gf-font-display text-lg text-gf-dark mb-4">3 · Look &amp; feel</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ColorControl label="Sky top" value={draft.visuals.bgTop} onChange={(v) => visual('bgTop', v)} />
          <ColorControl label="Sky bottom" value={draft.visuals.bgBottom} onChange={(v) => visual('bgBottom', v)} />
          <ColorControl label="Accent" value={draft.visuals.accent} onChange={(v) => visual('accent', v)} />
          <ColorControl label="Road" value={draft.visuals.road} onChange={(v) => visual('road', v)} />
        </div>
      </section>

      <section className="gf-card p-6">
        <h2 className="gf-font-display text-lg text-gf-dark mb-4">4 · Scoring</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberControl label="Points per correct" value={draft.scoring.basePerCorrect} onChange={(v) => scoring('basePerCorrect', v)} min={10} max={1000} step={10} />
          <NumberControl label="Streak bonus" value={draft.scoring.streakBonus} onChange={(v) => scoring('streakBonus', v)} min={0} max={200} step={5} />
          <NumberControl label="Coins per correct" value={draft.scoring.coinPerCorrect} onChange={(v) => scoring('coinPerCorrect', v)} min={0} max={50} step={1} />
        </div>
      </section>

      <section className="gf-card p-6">
        <h2 className="gf-font-display text-lg text-gf-dark mb-4">5 · End condition</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <Field label="Rule">
            <select value={draft.gameOver.type} onChange={(e) => goType(e.target.value as ModeDefinition['gameOver']['type'])} className="gf-input">
              {GAME_OVER_OPTIONS.map((o) => <option key={o.type} value={o.type}>{o.label}</option>)}
            </select>
            <p className="text-xs text-gf-dark/50 mt-1 font-bold">{GAME_OVER_OPTIONS.find((o) => o.type === draft.gameOver.type)?.hint}</p>
          </Field>
          <NumberControl label="Value" value={draft.gameOver.value} onChange={goValue} min={1} max={9999} step={1} />
        </div>
      </section>

      <div>
        {errors.length > 0 && (
          <div className="bg-gf-danger/10 text-gf-danger p-3 rounded-xl text-sm font-bold mb-4">
            {errors.map((e) => <div key={e}>• {e}</div>)}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="gf-btn gf-btn-outline text-sm">Cancel</button>
          <button onClick={onSave} className="gf-btn text-sm">💾 Save Mode</button>
        </div>
      </div>
    </div>
  )
}

// ── Reusable form pieces ─────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-gf-dark font-bold text-sm mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function SettingControl({ spec, value, onChange }: { spec: any; value: any; onChange: (v: any) => void }) {
  if (spec.kind === 'boolean') {
    return (
      <label className="flex items-center gap-3 text-gf-dark font-bold text-sm cursor-pointer">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
        {spec.label}
        {spec.hint && <span className="text-xs text-gf-dark/40 font-bold">{spec.hint}</span>}
      </label>
    )
  }
  if (spec.kind === 'select') {
    return (
      <div>
        <label className="text-gf-dark font-bold text-sm mb-1 block">{spec.label}</label>
        <select value={String(value)} onChange={(e) => onChange(Number(e.target.value))} className="gf-input">
          {(spec.options ?? []).map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  const [min, max, step] = spec.range ?? [0, 100, 1]
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-gf-dark font-bold text-sm">{spec.label}</label>
        <span className="gf-chip text-xs">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={Number(value)} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-1" />
      {spec.hint && <p className="text-xs text-gf-dark/40 font-bold mt-0.5">{spec.hint}</p>}
    </div>
  )
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-gf-dark font-bold text-sm mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 rounded-lg border-2 border-gf-dark/20 cursor-pointer" />
        <span className="text-xs font-mono text-gf-dark/60">{value}</span>
      </div>
    </div>
  )
}

function NumberControl({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <div>
      <label className="text-gf-dark font-bold text-sm mb-1 block">{label}</label>
      <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} className="gf-input" />
    </div>
  )
}
