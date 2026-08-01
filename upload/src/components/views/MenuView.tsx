'use client'

import { useState } from 'react'
import { useNav, getSavedName, saveName } from '@/lib/nav'
import { api } from '@/lib/api'

export function MenuView() {
  const { go } = useNav()
  const [name, setName] = useState(getSavedName())
  const [joinCode, setJoinCode] = useState('')
  const [joinErr, setJoinErr] = useState('')
  const [checking, setChecking] = useState(false)

  function pickMode(target: 'solo' | 'homework-list' | 'teacher' | 'join') {
    if (target !== 'join' && !name.trim()) {
      // Solo / homework also need a name; let's just save and proceed
      // (Game will prompt for name if missing)
    }
    if (name.trim()) saveName(name.trim())
    if (target === 'solo') go({ name: 'solo' })
    else if (target === 'homework-list') go({ name: 'homework-list' })
    else if (target === 'teacher') go({ name: 'teacher' })
    else if (target === 'join') {
      if (!name.trim()) { setJoinErr('Type your name first!'); return }
      if (!joinCode.trim()) { setJoinErr('Enter a room code!'); return }
      doJoin()
    }
  }

  async function doJoin() {
    setChecking(true); setJoinErr('')
    try {
      const code = joinCode.trim().toUpperCase()
      const r = await api<{ room: any }>(`/api/rooms/${code}`)
      if (r.room.status === 'ended') { setJoinErr('That room has ended.'); return }
      // Register the player
      const join = await api<{ player: any }>(`/api/rooms/${code}`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      })
      saveName(name.trim())
      go({
        name: 'live-play',
        code,
        playerId: join.player.id,
        playerName: name.trim(),
        isHost: false,
      })
    } catch (e: any) {
      setJoinErr(e.message || 'Could not join room')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="tr-bg min-h-screen w-full overflow-auto">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block tr-chip mb-4">🏁 BRAIN EDITION</div>
          <h1 className="tr-font-display text-5xl sm:text-7xl text-[var(--tr-navy)] leading-none mb-3">
            TURBO<span className="tr-grad-text">RUSH!</span>
          </h1>
          <p className="text-[var(--tr-navy)]/80 font-bold text-lg sm:text-xl">
            Race hard · Answer smart · Hit the ramps!
          </p>
        </div>

        {/* Name entry */}
        <div className="tr-card p-5 sm:p-7 mb-6 tr-pop">
          <label className="block text-[var(--tr-navy)] font-extrabold text-sm mb-2 tr-font-display tracking-wide">
            ★ YOUR DRIVER NAME ★
          </label>
          <input
            className="tr-input"
            placeholder="TYPE YOUR NAME"
            maxLength={14}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (document.getElementById('soloBtn') as HTMLButtonElement)?.click() }}
          />
        </div>

        {/* Mode picker — 3 big cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <ModeCard
            emoji="🏁"
            title="SOLO PRACTICE"
            desc="Race against yourself. Pick a question set, drive forever, beat your best score."
            cta="START DRIVING"
            onClick={() => pickMode('solo')}
          />
          <ModeCard
            emoji="📡"
            title="JOIN LIVE GAME"
            desc="Got a 6-character room code from your teacher? Jump into the live class race."
            cta="ENTER CODE"
            onClick={() => pickMode('join')}
            highlight
          />
          <ModeCard
            emoji="📚"
            title="HOMEWORK"
            desc="Got an assignment? Play through your teacher's question set, results get reported automatically."
            cta="VIEW HOMEWORK"
            onClick={() => pickMode('homework-list')}
          />
        </div>

        {/* Join code panel (always visible for convenience) */}
        <div className="tr-card p-5 sm:p-7 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-[var(--tr-navy)] font-extrabold text-sm mb-2 tr-font-display tracking-wide">
                🔑 HAVE A JOIN CODE?
              </label>
              <input
                className="tr-input uppercase tracking-[0.3em] text-center"
                placeholder="ABC123"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') pickMode('join') }}
              />
            </div>
            <button
              id="soloBtn"
              className="tr-btn tr-btn-red"
              onClick={() => pickMode('join')}
              disabled={checking}
              style={{ minWidth: 180 }}
            >
              {checking ? '…' : '🚦 JOIN RACE'}
            </button>
          </div>
          {joinErr && <p className="text-[var(--tr-red)] font-bold mt-3 text-sm">⚠️ {joinErr}</p>}
        </div>

        {/* Teacher link */}
        <div className="text-center">
          <button
            className="text-[var(--tr-navy)] font-bold underline hover:no-underline opacity-80 hover:opacity-100"
            onClick={() => go({ name: 'teacher' })}
          >
            🧑‍🏫 Teacher tools — create question sets, host live games, assign homework
          </button>
        </div>

        <p className="text-center text-[var(--tr-navy)]/60 text-sm mt-8">
          Made for middle &amp; high school classrooms · Built with 💛 for learning
        </p>
      </div>
    </div>
  )
}

function ModeCard({ emoji, title, desc, cta, onClick, highlight }: {
  emoji: string
  title: string
  desc: string
  cta: string
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`tr-card p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl tr-pop ${
        highlight ? 'ring-4 ring-[var(--tr-yellow)]' : ''
      }`}
      style={{ background: highlight ? 'var(--tr-cream)' : 'white' }}
    >
      <div className="text-5xl mb-3 tr-float inline-block">{emoji}</div>
      <h3 className="tr-font-display text-2xl text-[var(--tr-navy)] mb-2">{title}</h3>
      <p className="text-[var(--tr-navy)]/70 font-semibold text-sm mb-5 leading-snug">{desc}</p>
      <span className="tr-btn tr-btn-outline text-sm" style={{ padding: '8px 18px' }}>
        {cta} →
      </span>
    </button>
  )
}
