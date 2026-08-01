'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useNav } from '@/lib/nav'
import { api } from '@/lib/api'
import { GamePlayer, GameConfig, GameQuestion, GameScoreEvent, GameOverEvent, GameAnswerEvent } from '@/components/game/GamePlayer'
import { liveSocketUrl } from '@/lib/api'

interface Player {
  id: string
  name: string
  score: number
  correct: number
  wrong: number
  bestStreak: number
  coins: number
  isHost: boolean
  online?: boolean
}

interface Props {
  code: string
  playerId: string
  playerName: string
  isHost: boolean
}

export function LivePlayView({ code, playerId, playerName, isHost }: Props) {
  const { back } = useNav()
  const [room, setRoom] = useState<{
    status: 'lobby' | 'playing' | 'ended'
    mode: 'slow' | 'heart'
    setId: string
    questions: GameQuestion[]
    setTitle: string
    subject: string
    gradeLevel: string
  } | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [myFinalScore, setMyFinalScore] = useState<GameOverEvent | null>(null)
  const scoreThrottleRef = useRef<number>(0)

  // Load room info from DB
  useEffect(() => {
    api<{ room: any }>(`/api/rooms/${code}`).then(r => {
      setRoom({
        status: r.room.status,
        mode: r.room.mode,
        setId: r.room.setId,
        questions: r.room.questions.map((q: any) => ({
          q: q.text, a: q.choices, c: q.correctIdx, explanation: q.explanation,
        })),
        setTitle: r.room.setTitle,
        subject: r.room.subject,
        gradeLevel: r.room.gradeLevel,
      })
      setPlayers(r.room.players)
    })
  }, [code])

  // Connect to socket.io
  useEffect(() => {
    const s = io(liveSocketUrl(), { transports: ['websocket', 'polling'] })
    setSocket(s)
    s.on('connect', () => {
      setConnected(true)
      s.emit('join-room', { code, player: { id: playerId, name: playerName, isHost } })
    })
    s.on('disconnect', () => setConnected(false))
    s.on('room-state', (data: any) => {
      setPlayers(data.players || [])
      if (data.status === 'playing' && !gameStarted) setGameStarted(true)
      if (data.status === 'ended') {
        // room was ended by host
      }
    })
    s.on('game-start', () => setGameStarted(true))
    s.on('game-ended', () => {
      // host ended the game
    })
    s.on('join-error', (data: any) => {
      alert(data.message || 'Could not join room')
      back()
    })
    return () => { s.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerId])

  function handleScore(e: GameScoreEvent) {
    // Throttle: max 1 update / 800ms
    const now = Date.now()
    if (now - scoreThrottleRef.current < 800) return
    scoreThrottleRef.current = now
    socket?.emit('score-update', {
      code, playerId,
      score: e.score, correct: e.correct, wrong: e.wrong,
      bestStreak: e.bestStreak, coins: e.coins,
    })
  }

  function handleAnswer(e: GameAnswerEvent) {
    socket?.emit('answer', {
      code, playerId,
      correct: e.correct, question: e.question,
    })
  }

  function handleGameOver(e: GameOverEvent) {
    setMyFinalScore(e)
    socket?.emit('score-update', {
      code, playerId,
      score: e.score, correct: e.correct, wrong: e.wrong,
      bestStreak: e.bestStreak, coins: e.coins,
    })
  }

  function hostStartGame() {
    socket?.emit('start-game', { code })
    // Also PATCH the DB room status
    api(`/api/rooms/${code}`, { method: 'PATCH', body: JSON.stringify({ status: 'playing' }) })
  }
  function hostEndGame() {
    socket?.emit('end-game', { code })
    api(`/api/rooms/${code}`, { method: 'PATCH', body: JSON.stringify({ status: 'ended' }) })
    setTimeout(() => back(), 1500)
  }

  // Loading state
  if (!room) {
    return (
      <div className="tr-bg min-h-screen flex items-center justify-center">
        <div className="tr-card p-8 text-center tr-pop">
          <div className="text-4xl mb-3 tr-float inline-block">📡</div>
          <p className="tr-font-display text-xl text-[var(--tr-navy)]">Connecting to room {code}…</p>
        </div>
      </div>
    )
  }

  // Lobby view (before host starts)
  if (!gameStarted) {
    return (
      <div className="tr-bg min-h-screen w-full overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button onClick={back} className="tr-btn tr-btn-outline mb-6" style={{ padding: '8px 16px', fontSize: 14 }}>
            ← LEAVE
          </button>

          <div className="tr-card p-6 sm:p-8 tr-pop mb-6">
            <div className="text-center mb-6">
              <p className="text-sm font-bold text-[var(--tr-navy)]/60 mb-1">📡 LIVE CLASS GAME</p>
              <h2 className="tr-font-display text-3xl text-[var(--tr-navy)] mb-1">{room.setTitle}</h2>
              <div className="flex justify-center gap-2 my-3 flex-wrap">
                <span className="tr-chip">{room.subject}</span>
                <span className="tr-chip">{room.gradeLevel}</span>
                <span className="tr-chip">{room.questions.length} questions</span>
                <span className="tr-chip">{room.mode === 'heart' ? '💔 Lose Heart' : '🐢 Slow Down'}</span>
              </div>
            </div>

            {/* Big room code */}
            <div className="text-center mb-6">
              <p className="text-xs font-bold text-[var(--tr-navy)]/60 mb-2">ROOM CODE</p>
              <div className="tr-font-display text-5xl sm:text-7xl text-[var(--tr-navy)] tracking-[0.2em] bg-[var(--tr-yellow)] py-3 px-6 rounded-2xl border-3 border-[var(--tr-navy)] inline-block"
                   style={{ border: '3px solid var(--tr-navy)' }}>
                {code}
              </div>
              <p className="text-sm text-[var(--tr-navy)]/60 mt-3">
                {isHost ? 'Share this code with your students!' : 'Waiting for teacher to start the race…'}
              </p>
            </div>

            {/* Players list */}
            <div className="bg-[var(--tr-cream)] rounded-2xl p-4 mb-4">
              <p className="font-bold text-[var(--tr-navy)] mb-2">
                👥 PLAYERS IN ROOM ({players.length})
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {players.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border-2 border-[var(--tr-navy)]/20">
                    <span className="font-bold text-[var(--tr-navy)]">
                      {p.isHost && '🧑‍🏫 '}{p.name}
                      {p.id === playerId && <span className="text-xs ml-2 opacity-60">(you)</span>}
                    </span>
                    <span className={`text-xs ${p.online ? 'text-green-600' : 'text-gray-400'}`}>
                      {p.online ? '● online' : '○ away'}
                    </span>
                  </div>
                ))}
                {players.length === 0 && <p className="text-sm text-[var(--tr-navy)]/60">No one here yet…</p>}
              </div>
            </div>

            {isHost ? (
              <button className="tr-btn w-full" onClick={hostStartGame} disabled={players.length === 0}>
                🚦 START THE RACE! ({players.length} player{players.length === 1 ? '' : 's'})
              </button>
            ) : (
              <div className="text-center">
                <div className="inline-block tr-float text-4xl mb-2">⏳</div>
                <p className="font-bold text-[var(--tr-navy)]/80">Waiting for your teacher to start…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Playing view — student side
  if (!isHost) {
    const config: GameConfig = {
      questions: room.questions,
      mode: room.mode,
      name: playerName,
      autoStart: true,
    }
    return (
      <div className="fixed inset-0 bg-black flex">
        <div className="flex-1 relative">
          <GamePlayer
            config={config}
            onScore={handleScore}
            onAnswer={handleAnswer}
            onGameOver={handleGameOver}
            className="w-full h-full"
          />
        </div>
        {/* Floating mini-leaderboard */}
        <LeaderboardOverlay players={players} myId={playerId} code={code} onExit={back} />
        {myFinalScore && (
          <GameOverModal
            score={myFinalScore}
            myRank={players.findIndex(p => p.id === playerId) + 1}
            totalPlayers={players.length}
            onExit={back}
          />
        )}
      </div>
    )
  }

  // Host view during play — watches leaderboard (no game iframe)
  return (
    <div className="tr-bg min-h-screen w-full overflow-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={back} className="tr-btn tr-btn-outline" style={{ padding: '8px 16px', fontSize: 14 }}>
            ← EXIT
          </button>
          <span className="tr-chip">📡 HOST VIEW · CODE {code}</span>
          <button className="tr-btn tr-btn-red" onClick={hostEndGame} style={{ padding: '8px 16px', fontSize: 14 }}>
            ⏹ END GAME
          </button>
        </div>

        <div className="tr-card p-6 mb-6">
          <h2 className="tr-font-display text-2xl text-[var(--tr-navy)] mb-1">🏆 LIVE LEADERBOARD</h2>
          <p className="text-sm text-[var(--tr-navy)]/60 mb-4">{room.setTitle} · {players.length} players</p>
          <div className="space-y-2">
            {players.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                p.id === playerId ? 'bg-[var(--tr-yellow)] border-[var(--tr-navy)]' : 'bg-white border-[var(--tr-navy)]/15'
              }`}>
                <span className="tr-font-display text-2xl text-[var(--tr-navy)] w-10 text-center">
                  {i + 1 <= 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`}
                </span>
                <div className="flex-1">
                  <div className="font-extrabold text-[var(--tr-navy)]">{p.name}{p.isHost && ' 🧑‍🏫'}</div>
                  <div className="text-xs text-[var(--tr-navy)]/60 font-semibold">
                    ✅ {p.correct} · ❌ {p.wrong} · 🔥 ×{p.bestStreak} · 🪙 {p.coins}
                  </div>
                </div>
                <div className="tr-font-display text-2xl tr-grad-text">{p.score}</div>
              </div>
            ))}
            {players.length === 0 && <p className="text-center text-[var(--tr-navy)]/60 py-6">No players yet…</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function LeaderboardOverlay({ players, myId, code, onExit }: {
  players: Player[]; myId: string; code: string; onExit: () => void
}) {
  const [open, setOpen] = useState(false)
  const myRank = players.findIndex(p => p.id === myId) + 1
  const me = players.find(p => p.id === myId)

  return (
    <>
      {/* Always-visible mini status */}
      <div className="absolute top-3 right-3 z-40 flex gap-2">
        <button
          className="tr-btn tr-btn-outline"
          style={{ padding: '6px 12px', fontSize: 13 }}
          onClick={() => setOpen(o => !o)}
        >
          🏆 #{myRank || '-'} · {me?.score ?? 0}
        </button>
        <button
          className="tr-btn tr-btn-red"
          style={{ padding: '6px 12px', fontSize: 13 }}
          onClick={onExit}
        >
          ✕
        </button>
      </div>

      {/* Expandable leaderboard */}
      {open && (
        <div className="absolute top-16 right-3 z-40 tr-card p-4 tr-pop" style={{ width: 320, maxWidth: '90vw' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="tr-font-display text-lg text-[var(--tr-navy)]">🏆 LEADERBOARD</h3>
            <button onClick={() => setOpen(false)} className="text-[var(--tr-navy)]/60 text-sm font-bold">✕</button>
          </div>
          <p className="text-xs text-[var(--tr-navy)]/60 mb-3">Room {code}</p>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {players.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${
                p.id === myId ? 'bg-[var(--tr-yellow)]' : 'bg-[var(--tr-cream)]'
              }`}>
                <span className="font-bold text-[var(--tr-navy)] text-sm">
                  {i + 1 <= 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`} {p.name}
                </span>
                <span className="tr-font-display text-[var(--tr-navy)]">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function GameOverModal({ score, myRank, totalPlayers, onExit }: {
  score: GameOverEvent; myRank: number; totalPlayers: number; onExit: () => void
}) {
  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="tr-card p-8 text-center tr-pop" style={{ maxWidth: 400, width: '100%' }}>
        <h2 className="tr-font-display text-3xl text-[var(--tr-navy)] mb-1">🏁 RACE OVER!</h2>
        <p className="text-[var(--tr-navy)]/70 font-bold mb-3">Your final score</p>
        <div className="tr-font-display text-5xl tr-grad-text mb-4">{score.score}</div>
        <div className="grid grid-cols-2 gap-2 mb-5 text-sm">
          <Stat emoji="✅" label="Correct" value={`${score.correct}/${score.correct + score.wrong}`} />
          <Stat emoji="🔥" label="Best Streak" value={`×${score.bestStreak}`} />
          <Stat emoji="🪙" label="Coins" value={String(score.coins)} />
          <Stat emoji="📏" label="Distance" value={`${score.dist} m`} />
        </div>
        <div className="bg-[var(--tr-cream)] rounded-xl p-3 mb-5">
          <p className="font-bold text-[var(--tr-navy)]">
            🏆 You ranked #{myRank} out of {totalPlayers}!
          </p>
        </div>
        <button className="tr-btn w-full" onClick={onExit}>
          ← BACK TO MENU
        </button>
      </div>
    </div>
  )
}

function Stat({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="bg-[var(--tr-cream)] rounded-lg p-2">
      <div className="text-xs text-[var(--tr-navy)]/60 font-bold">{emoji} {label}</div>
      <div className="font-extrabold text-[var(--tr-navy)]">{value}</div>
    </div>
  )
}
