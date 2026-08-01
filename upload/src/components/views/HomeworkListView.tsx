'use client'

import { useEffect, useState } from 'react'
import { useNav, getSavedName, saveName } from '@/lib/nav'
import { api } from '@/lib/api'

interface HW {
  id: string
  title: string
  setId: string
  dueDate: string | null
  set: { title: string; subject: string; gradeLevel: string }
  _count: { submissions: number }
}

export function HomeworkListView() {
  const { back, go } = useNav()
  const [name, setName] = useState(getSavedName())
  const [list, setList] = useState<HW[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ homework: HW[] }>('/api/homework').then(r => {
      setList(r.homework)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="tr-bg min-h-screen w-full overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={back} className="tr-btn tr-btn-outline mb-6" style={{ padding: '8px 16px', fontSize: 14 }}>
          ← BACK
        </button>

        <div className="tr-card p-6 sm:p-8 tr-pop">
          <h2 className="tr-font-display text-3xl text-[var(--tr-navy)] mb-1">📚 HOMEWORK</h2>
          <p className="text-[var(--tr-navy)]/70 font-semibold mb-5">
            Pick an assignment, play through it, and your score gets reported to your teacher automatically.
          </p>

          <label className="block text-[var(--tr-navy)] font-extrabold text-sm mb-2 tr-font-display tracking-wide">
            YOUR NAME
          </label>
          <input
            className="tr-input mb-6"
            placeholder="TYPE YOUR NAME"
            maxLength={14}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {loading ? (
            <p className="text-[var(--tr-navy)]/60">Loading…</p>
          ) : list.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3 tr-float inline-block">📭</div>
              <p className="font-bold text-[var(--tr-navy)]/70">No homework assigned yet.</p>
              <p className="text-sm text-[var(--tr-navy)]/60 mt-1">Ask your teacher to create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map(h => (
                <button
                  key={h.id}
                  onClick={() => {
                    if (!name.trim()) { alert('Type your name first!'); return }
                    saveName(name.trim())
                    go({ name: 'homework-play', id: h.id, playerName: name.trim() })
                  }}
                  className="w-full text-left p-4 rounded-xl border-2 border-[var(--tr-navy)]/20 bg-white hover:border-[var(--tr-navy)] hover:bg-[var(--tr-cream)] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-extrabold text-[var(--tr-navy)] text-lg">{h.title}</h4>
                      <div className="flex gap-2 my-1 flex-wrap">
                        <span className="tr-chip">{h.set.subject}</span>
                        <span className="tr-chip">{h.set.gradeLevel}</span>
                        <span className="tr-chip">{h._count.submissions} submitted</span>
                        {h.dueDate && <span className="tr-chip">📅 Due {new Date(h.dueDate).toLocaleDateString()}</span>}
                      </div>
                      <p className="text-xs text-[var(--tr-navy)]/60 font-semibold">Based on: {h.set.title}</p>
                    </div>
                    <span className="tr-btn tr-btn-outline" style={{ padding: '8px 14px', fontSize: 13 }}>
                      ▶ PLAY
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
