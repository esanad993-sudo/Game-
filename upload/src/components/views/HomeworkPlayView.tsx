'use client'

import { useEffect, useState } from 'react'
import { useNav } from '@/lib/nav'
import { api } from '@/lib/api'
import { GamePlayer, GameConfig, GameQuestion, GameOverEvent } from '@/components/game/GamePlayer'

interface Props {
  id: string
  playerName: string
}

export function HomeworkPlayView({ id, playerName }: Props) {
  const { back } = useNav()
  const [hw, setHw] = useState<{
    title: string
    setTitle: string
    subject: string
    gradeLevel: string
    questions: GameQuestion[]
    dueDate: string | null
  } | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<GameOverEvent | null>(null)

  useEffect(() => {
    api<{ homework: any }>(`/api/homework/${id}`).then(r => {
      setHw({
        title: r.homework.title,
        setTitle: r.homework.setTitle,
        subject: r.homework.subject,
        gradeLevel: r.homework.gradeLevel,
        dueDate: r.homework.dueDate,
        questions: r.homework.questions.map((q: any) => ({
          q: q.text, a: q.choices, c: q.correctIdx, explanation: q.explanation,
        })),
      })
    }).catch(e => setError(e.message))
  }, [id])

  async function handleGameOver(e: GameOverEvent) {
    if (submitting) return // already submitted (race-again not allowed in HW mode)
    setSubmitting(true)
    try {
      await api(`/api/homework/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          playerName,
          score: e.score,
          correct: e.correct,
          wrong: e.wrong,
          bestStreak: e.bestStreak,
          coins: e.coins,
          mistakes: e.mistakes,
        }),
      })
      setDone(e)
    } catch (err: any) {
      alert('Could not submit homework: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="tr-bg min-h-screen flex items-center justify-center p-4">
        <div className="tr-card p-8 text-center">
          <p className="text-2xl mb-3">😕</p>
          <p className="font-bold text-[var(--tr-navy)] mb-3">{error}</p>
          <button className="tr-btn" onClick={back}>← BACK</button>
        </div>
      </div>
    )
  }

  if (!hw) {
    return (
      <div className="tr-bg min-h-screen flex items-center justify-center">
        <div className="tr-card p-8 text-center tr-pop">
          <p className="tr-font-display text-xl text-[var(--tr-navy)]">Loading homework…</p>
        </div>
      </div>
    )
  }

  // Show submission confirmation
  if (done) {
    return (
      <div className="tr-bg min-h-screen flex items-center justify-center p-4">
        <div className="tr-card p-8 text-center tr-pop max-w-md w-full">
          <div className="text-6xl mb-3 tr-float inline-block">✅</div>
          <h2 className="tr-font-display text-3xl text-[var(--tr-navy)] mb-1">HOMEWORK SUBMITTED!</h2>
          <p className="text-[var(--tr-navy)]/70 font-bold mb-5">Your results have been sent to your teacher.</p>
          <div className="bg-[var(--tr-cream)] rounded-xl p-4 mb-5">
            <div className="tr-font-display text-5xl tr-grad-text mb-2">{done.score}</div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div><b>{done.correct}</b> correct</div>
              <div><b>{done.wrong}</b> wrong</div>
              <div>🔥 ×<b>{done.bestStreak}</b></div>
              <div>🪙 <b>{done.coins}</b></div>
            </div>
          </div>
          <button className="tr-btn w-full" onClick={back}>← BACK TO HOMEWORK</button>
        </div>
      </div>
    )
  }

  // Play
  const config: GameConfig = {
    questions: hw.questions,
    mode: 'slow', // homework always uses gentle mode
    name: playerName,
    autoStart: true,
  }
  return (
    <div className="fixed inset-0 bg-black flex">
      <button
        onClick={() => { if (confirm('Leave this homework? Your progress will be lost.')) back() }}
        className="absolute top-3 left-3 z-50 tr-btn tr-btn-outline"
        style={{ padding: '6px 14px', fontSize: 14 }}
      >
        ← EXIT
      </button>
      <div className="absolute top-3 right-3 z-50 tr-chip" style={{ background: 'white' }}>
        📚 {hw.title}
      </div>
      <GamePlayer
        config={config}
        onGameOver={handleGameOver}
        className="w-full h-full"
      />
      {submitting && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40">
          <div className="tr-card p-6 text-center">
            <div className="text-3xl mb-2 tr-float inline-block">📨</div>
            <p className="tr-font-display text-xl text-[var(--tr-navy)]">Submitting…</p>
          </div>
        </div>
      )}
    </div>
  )
}
