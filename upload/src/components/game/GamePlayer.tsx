'use client'

import { useEffect, useRef, useState } from 'react'

export interface GameQuestion {
  q: string
  a: string[]
  c: number
  explanation?: string
}

export interface GameConfig {
  questions?: GameQuestion[]
  mode?: 'slow' | 'heart'
  name?: string
  autoStart?: boolean
}

export interface GameAnswerEvent {
  type: 'answer'
  correct: boolean
  question: string
  picked: string
  answer: string
}
export interface GameScoreEvent {
  type: 'score'
  score: number
  correct: number
  wrong: number
  bestStreak: number
  coins: number
  hearts: number
  dist: number
}
export interface GameOverEvent {
  type: 'gameover'
  score: number
  correct: number
  wrong: number
  bestStreak: number
  coins: number
  dist: number
  mistakes: { q: string; picked: string; answer: string }[]
}
export interface GameReadyEvent { type: 'ready' }
export interface GameStartedEvent { type: 'started' }
export type GameEvent = GameAnswerEvent | GameScoreEvent | GameOverEvent | GameReadyEvent | GameStartedEvent

interface Props {
  config: GameConfig
  onAnswer?: (e: GameAnswerEvent) => void
  onScore?: (e: GameScoreEvent) => void
  onGameOver?: (e: GameOverEvent) => void
  onReady?: () => void
  className?: string
}

export function GamePlayer({ config, onAnswer, onScore, onGameOver, onReady, className }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const cbRef = useRef({ onAnswer, onScore, onGameOver, onReady })
  useEffect(() => {
    cbRef.current = { onAnswer, onScore, onGameOver, onReady }
  })

  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      const d = ev.data
      if (!d || d.source !== 'turbo-rush') return
      if (d.type === 'ready') {
        setReady(true)
        cbRef.current.onReady?.()
        return
      }
      if (d.type === 'answer') cbRef.current.onAnswer?.(d as GameAnswerEvent)
      else if (d.type === 'score') cbRef.current.onScore?.(d as GameScoreEvent)
      else if (d.type === 'gameover') cbRef.current.onGameOver?.(d as GameOverEvent)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    if (!ready) return
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    iframe.contentWindow.postMessage({
      target: 'turbo-rush',
      type: 'config',
      questions: config.questions,
      mode: config.mode,
      name: config.name,
      autoStart: config.autoStart,
    }, '*')
  }, [ready, config])

  return (
    <iframe
      ref={iframeRef}
      src="/game.html"
      title="Turbo Rush Brain Edition"
      className={className ?? 'w-full h-full border-0'}
      allow="autoplay; fullscreen; gamepad"
      allowFullScreen
      style={{ background: '#9FDDF7' }}
    />
  )
}
