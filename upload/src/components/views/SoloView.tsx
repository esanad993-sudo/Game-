'use client'

import { useEffect, useState } from 'react'
import { useNav, getSavedName, saveName } from '@/lib/nav'
import { api } from '@/lib/api'
import { GamePlayer, GameConfig, GameQuestion, GameOverEvent } from '@/components/game/GamePlayer'

interface Set {
  id: string
  title: string
  subject: string
  gradeLevel: string
  description: string
  _count: { questions: number }
}

export function SoloView() {
  const { back } = useNav()
  const [name, setName] = useState(getSavedName())
  const [sets, setSets] = useState<Set[]>([])
  const [loadingSets, setLoadingSets] = useState(true)
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<GameQuestion[] | null>(null)
  const [mode, setMode] = useState<'slow' | 'heart'>('slow')
  const [started, setStarted] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [bestScore, setBestScore] = useState<number>(0)

  useEffect(() => {
    api<{ sets: Set[] }>('/api/sets').then(r => {
      setSets(r.sets)
      setLoadingSets(false)
    }).catch(() => setLoadingSets(false))
  }, [])

  // Load questions when a set is selected
  useEffect(() => {
    if (!selectedSetId) { setQuestions(null); return }
    api<{ set: any }>(`/api/sets/${selectedSetId}`).then(r => {
      const qs: GameQuestion[] = r.set.questions.map((q: any) => ({
        q: q.text,
        a: q.choices,
        c: q.correctIdx,
        explanation: q.explanation,
      }))
      setQuestions(qs)
    })
  }, [selectedSetId])

  function start() {
    const n = name.trim()
    if (!n) { alert('Type your name first!'); return }
    saveName(n)
    if (!questions || questions.length === 0) {
      // No set picked — let the game use its built-in questions
    }
    setStarted(true)
  }

  function handleGameOver(e: GameOverEvent) {
    setLastScore(e.score)
    // Persist best score per... well, per browser for now (solo mode)
    const best = parseInt(localStorage.getItem('tr_best_solo') || '0', 10)
    if (e.score > best) {
      localStorage.setItem('tr_best_solo', String(e.score))
      setBestScore(e.score)
    } else {
      setBestScore(best)
    }
  }

  if (started && (questions || !selectedSetId)) {
    const config: GameConfig = {
      name: name.trim(),
      mode,
      autoStart: true,
      ...(questions && questions.length > 0 ? { questions } : {}),
    }
    return (
      <div className="fixed inset-0 bg-black">
        <button
          onClick={() => { setStarted(false) }}
          className="absolute top-3 left-3 z-50 tr-btn tr-btn-outline"
          style={{ padding: '6px 14px', fontSize: 14 }}
        >
          ← Exit
        </button>
        <GamePlayer
          config={config}
          onGameOver={handleGameOver}
          className="w-full h-full"
        />
        {lastScore !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="tr-card p-8 text-center pointer-events-auto tr-pop" style={{ minWidth: 320 }}>
              <h2 className="tr-font-display text-3xl text-[var(--tr-navy)] mb-2">🏁 RACE OVER!</h2>
              <p className="text-[var(--tr-navy)]/70 font-bold mb-4">Your score</p>
              <div className="tr-font-display text-5xl tr-grad-text mb-4">{lastScore}</div>
              <p className="text-sm font-bold text-[var(--tr-navy)]/60 mb-4">Best: {bestScore}</p>
              <div className="flex gap-3 justify-center">
                <button
                  className="tr-btn"
                  onClick={() => { setLastScore(null); /* reload iframe to restart */ window.location.reload() }}
                >
                  🔁 RACE AGAIN
                </button>
                <button className="tr-btn tr-btn-outline" onClick={() => { setStarted(false); setLastScore(null) }}>
                  ← MENU
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="tr-bg min-h-screen w-full overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={back} className="tr-btn tr-btn-outline mb-6" style={{ padding: '8px 16px', fontSize: 14 }}>
          ← BACK
        </button>

        <div className="tr-card p-6 sm:p-8 tr-pop">
          <h2 className="tr-font-display text-3xl text-[var(--tr-navy)] mb-1">🏁 SOLO PRACTICE</h2>
          <p className="text-[var(--tr-navy)]/70 font-semibold mb-6">
            Pick a question set, choose your mode, and drive. Your best score is saved on this device.
          </p>

          {/* Name */}
          <label className="block text-[var(--tr-navy)] font-extrabold text-sm mb-2 tr-font-display tracking-wide">
            DRIVER NAME
          </label>
          <input
            className="tr-input mb-5"
            placeholder="TYPE YOUR NAME"
            maxLength={14}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Mode picker */}
          <label className="block text-[var(--tr-navy)] font-extrabold text-sm mb-2 tr-font-display tracking-wide">
            WRONG ANSWER MODE
          </label>
          <div className="flex gap-3 mb-6">
            <ModeBtn sel={mode === 'slow'} onClick={() => setMode('slow')} emoji="🐢" label="SLOW DOWN" />
            <ModeBtn sel={mode === 'heart'} onClick={() => setMode('heart')} emoji="💔" label="LOSE HEART" />
          </div>

          {/* Set picker */}
          <label className="block text-[var(--tr-navy)] font-extrabold text-sm mb-2 tr-font-display tracking-wide">
            QUESTION SET
          </label>
          <p className="text-sm text-[var(--tr-navy)]/60 mb-3">
            Leave unchecked to use the game's built-in set.
          </p>
          {loadingSets ? (
            <p className="text-[var(--tr-navy)]/60">Loading…</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 mb-6 max-h-[400px] overflow-y-auto pr-1">
              <SetCard
                sel={selectedSetId === null}
                onClick={() => setSelectedSetId(null)}
                title="Built-in (Default)"
                subject="Mixed"
                gradeLevel="all"
                count={8}
                description="The game's classic question set."
              />
              {sets.map(s => (
                <SetCard
                  key={s.id}
                  sel={selectedSetId === s.id}
                  onClick={() => setSelectedSetId(s.id)}
                  title={s.title}
                  subject={s.subject}
                  gradeLevel={s.gradeLevel}
                  count={s._count.questions}
                  description={s.description}
                />
              ))}
            </div>
          )}

          <button
            className="tr-btn w-full"
            onClick={start}
            disabled={!name.trim()}
          >
            🏁 START ENGINE
          </button>
        </div>
      </div>
    </div>
  )
}

function ModeBtn({ sel, onClick, emoji, label }: { sel: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 tr-btn ${sel ? '' : 'tr-btn-outline'}`}
      style={{ opacity: sel ? 1 : 0.7 }}
    >
      <span className="text-2xl">{emoji}</span> {label}
    </button>
  )
}

function SetCard({ sel, onClick, title, subject, gradeLevel, count, description }: {
  sel: boolean; onClick: () => void
  title: string; subject: string; gradeLevel: string; count: number; description: string
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        sel
          ? 'bg-[var(--tr-yellow)] border-[var(--tr-navy)] shadow-[0_4px_0_0_var(--tr-navy)]'
          : 'bg-white border-[var(--tr-navy)]/20 hover:border-[var(--tr-navy)]'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-extrabold text-[var(--tr-navy)] text-base">{title}</h4>
        {sel && <span className="tr-chip">✓ PICKED</span>}
      </div>
      <div className="flex gap-2 mb-2 flex-wrap">
        <span className="tr-chip">{subject}</span>
        <span className="tr-chip">{gradeLevel}</span>
        <span className="tr-chip">{count} Qs</span>
      </div>
      <p className="text-xs text-[var(--tr-navy)]/60 font-semibold leading-snug">{description}</p>
    </button>
  )
}
