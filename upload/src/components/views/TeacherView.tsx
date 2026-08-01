'use client'

import { useEffect, useState } from 'react'
import { useNav } from '@/lib/nav'
import { api } from '@/lib/api'

type Tab = 'sets' | 'live' | 'homework' | 'results'

export function TeacherView() {
  const { back, go } = useNav()
  const [tab, setTab] = useState<Tab>('sets')

  return (
    <div className="tr-bg min-h-screen w-full overflow-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <button onClick={back} className="tr-btn tr-btn-outline" style={{ padding: '8px 16px', fontSize: 14 }}>
            ← BACK
          </button>
          <h1 className="tr-font-display text-2xl text-[var(--tr-navy)]">🧑‍🏫 TEACHER TOOLS</h1>
          <span className="tr-chip">Beta</span>
        </div>

        {/* Tabs */}
        <div className="tr-card p-2 mb-6 flex gap-1 flex-wrap">
          <TabBtn sel={tab === 'sets'} onClick={() => setTab('sets')} label="📚 Question Sets" />
          <TabBtn sel={tab === 'live'} onClick={() => setTab('live')} label="📡 Live Class Game" />
          <TabBtn sel={tab === 'homework'} onClick={() => setTab('homework')} label="📝 Homework" />
          <TabBtn sel={tab === 'results'} onClick={() => setTab('results')} label="🏆 Results" />
        </div>

        {tab === 'sets' && <SetsTab />}
        {tab === 'live' && <LiveTab go={go} />}
        {tab === 'homework' && <HomeworkTab />}
        {tab === 'results' && <ResultsTab />}
      </div>
    </div>
  )
}

function TabBtn({ sel, onClick, label }: { sel: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[160px] py-2 px-3 rounded-xl font-bold text-sm transition-all ${
        sel ? 'bg-[var(--tr-navy)] text-white' : 'text-[var(--tr-navy)] hover:bg-[var(--tr-cream)]'
      }`}
    >
      {label}
    </button>
  )
}

/* ============ SETS TAB ============ */

interface Set {
  id: string
  title: string
  subject: string
  gradeLevel: string
  description: string
  _count: { questions: number }
}

function SetsTab() {
  const [sets, setSets] = useState<Set[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  function load() {
    setLoading(true)
    api<{ sets: Set[] }>('/api/sets').then(r => { setSets(r.sets); setLoading(false) })
  }
  useEffect(load, [])

  async function del(id: string) {
    if (!confirm('Delete this question set? This cannot be undone.')) return
    await api(`/api/sets/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="tr-card p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="tr-font-display text-xl text-[var(--tr-navy)]">📚 Question Sets</h2>
        <button className="tr-btn" onClick={() => setShowCreate(s => !s)} style={{ padding: '10px 18px', fontSize: 14 }}>
          {showCreate ? '✕ CANCEL' : '+ NEW SET'}
        </button>
      </div>

      {showCreate && <CreateSetForm onCreated={() => { setShowCreate(false); load() }} />}

      {loading ? (
        <p className="text-[var(--tr-navy)]/60">Loading…</p>
      ) : (
        <div className="space-y-2">
          {sets.map(s => (
            <div key={s.id} className="p-3 rounded-xl border-2 border-[var(--tr-navy)]/15 bg-white flex items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-[var(--tr-navy)]">{s.title}</h4>
                <div className="flex gap-2 my-1 flex-wrap">
                  <span className="tr-chip">{s.subject}</span>
                  <span className="tr-chip">{s.gradeLevel}</span>
                  <span className="tr-chip">{s._count.questions} Qs</span>
                </div>
                <p className="text-xs text-[var(--tr-navy)]/60 font-semibold">{s.description}</p>
              </div>
              <button className="tr-btn tr-btn-red" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => del(s.id)}>
                🗑
              </button>
            </div>
          ))}
          {sets.length === 0 && <p className="text-center py-6 text-[var(--tr-navy)]/60">No question sets yet. Create one!</p>}
        </div>
      )}
    </div>
  )
}

function CreateSetForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('General')
  const [gradeLevel, setGradeLevel] = useState<'middle' | 'high' | 'all'>('all')
  const [description, setDescription] = useState('')
  const [csvText, setCsvText] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const TEMPLATE = `Question,Answer A,Answer B,Answer C,Answer D,Correct
What is 5 + 5?,9,10,11,12,2
Which is the largest planet?,Earth,Mars,Jupiter,Venus,3
"Commas, inside quotes, are fine",A,B,C,D,1
True or false: ice is slippery?,True,False,,,1`

  function parseCsv(text: string): { qs: any[]; errs: string[] } {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length)
    const out: any[] = [], errs: string[] = []
    for (let n = 0; n < lines.length; n++) {
      // Simple CSV parser with quote support
      const cells: string[] = []
      let cur = '', inQ = false
      for (let i = 0; i < lines[n].length; i++) {
        const ch = lines[n][i]
        if (inQ) {
          if (ch === '"') { if (lines[n][i + 1] === '"') { cur += '"'; i++ } else inQ = false }
          else cur += ch
        } else {
          if (ch === '"') inQ = true
          else if (ch === ',' || ch === '\t' || ch === ';') { cells.push(cur); cur = '' }
          else cur += ch
        }
      }
      cells.push(cur)
      const clean = cells.map(s => s.trim())
      if (n === 0 && /question/i.test(clean[0]) && /correct|answer|ans|key/i.test(clean[clean.length - 1])) continue
      if (clean.length < 3) { errs.push(`Line ${n + 1}: need question + answers + correct column`); continue }
      const q = clean[0]
      const ans = clean.slice(1, clean.length - 1).filter(s => s.length)
      if (ans.length < 2) { errs.push(`Line ${n + 1}: needs at least 2 answers`); continue }
      const ansTrim = ans.slice(0, 4)
      const ciRaw = clean[clean.length - 1].toLowerCase().replace(/[.)\s'"]/g, '')
      let ci = -1
      if (/^[1-4]$/.test(ciRaw)) ci = +ciRaw - 1
      else if (/^[a-d]$/.test(ciRaw)) ci = ciRaw.charCodeAt(0) - 97
      else {
        const t = clean[clean.length - 1].trim().toLowerCase()
        ci = ansTrim.findIndex(a => a.toLowerCase() === t)
      }
      if (ci < 0 || ci >= ansTrim.length) { errs.push(`Line ${n + 1}: correct must be 1-${ansTrim.length} or A-${'ABCD'[ansTrim.length - 1]}`); continue }
      out.push({ q, a: ansTrim, c: ci })
    }
    return { qs: out, errs }
  }

  async function save() {
    setErr('')
    if (!title.trim()) { setErr('Title is required'); return }
    const { qs, errs } = parseCsv(csvText)
    if (qs.length === 0) { setErr('No valid questions found. ' + (errs[0] || 'Check the format.')); return }
    setSaving(true)
    try {
      await api('/api/sets', {
        method: 'POST',
        body: JSON.stringify({ title, subject, gradeLevel, description, questions: qs }),
      })
      onCreated()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[var(--tr-cream)] rounded-xl p-4 mb-4">
      <h3 className="tr-font-display text-lg text-[var(--tr-navy)] mb-3">+ NEW QUESTION SET</h3>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-bold text-[var(--tr-navy)] mb-1">TITLE</label>
          <input className="tr-input" placeholder="e.g. Chapter 5 Quiz" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-[var(--tr-navy)] mb-1">SUBJECT</label>
          <input className="tr-input" placeholder="e.g. Math, Science, History" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-bold text-[var(--tr-navy)] mb-1">GRADE LEVEL</label>
          <select className="tr-input" value={gradeLevel} onChange={e => setGradeLevel(e.target.value as any)}>
            <option value="all">All grades</option>
            <option value="middle">Middle (6-8)</option>
            <option value="high">High (9-12)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-[var(--tr-navy)] mb-1">DESCRIPTION (optional)</label>
          <input className="tr-input" placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>
      <label className="block text-xs font-bold text-[var(--tr-navy)] mb-1">QUESTIONS (CSV format)</label>
      <p className="text-xs text-[var(--tr-navy)]/70 mb-2">
        Format: <code>question,answer A,answer B,answer C,answer D,correct</code> — last column is 1-4 or A-D or the answer text. 2-4 answers per question.
      </p>
      <textarea
        className="tr-input font-mono text-sm"
        rows={6}
        placeholder={TEMPLATE}
        value={csvText}
        onChange={e => setCsvText(e.target.value)}
      />
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="tr-btn" onClick={save} disabled={saving} style={{ padding: '10px 18px', fontSize: 14 }}>
          {saving ? 'SAVING…' : '💾 SAVE SET'}
        </button>
        <button
          className="tr-btn tr-btn-outline"
          onClick={() => { navigator.clipboard?.writeText(TEMPLATE) }}
          style={{ padding: '10px 18px', fontSize: 14 }}
        >
          📋 COPY TEMPLATE
        </button>
      </div>
      {err && <p className="text-[var(--tr-red)] font-bold mt-3 text-sm">⚠️ {err}</p>}
    </div>
  )
}

/* ============ LIVE TAB ============ */

function LiveTab({ go }: { go: (v: any) => void }) {
  const [sets, setSets] = useState<Set[]>([])
  const [setId, setSetId] = useState('')
  const [mode, setMode] = useState<'slow' | 'heart'>('slow')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api<{ sets: Set[] }>('/api/sets').then(r => {
      setSets(r.sets)
      if (r.sets[0]) setSetId(r.sets[0].id)
    })
  }, [])

  async function createRoom() {
    if (!setId) return
    setCreating(true)
    try {
      const r = await api<{ room: any }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ setId, mode }),
      })
      // Register the teacher as host
      const join = await api<{ player: any }>(`/api/rooms/${r.room.code}`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Teacher', isHost: true }),
      })
      go({
        name: 'live-play',
        code: r.room.code,
        playerId: join.player.id,
        playerName: 'Teacher',
        isHost: true,
      })
    } catch (e: any) {
      alert('Could not create room: ' + e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="tr-card p-6">
      <h2 className="tr-font-display text-xl text-[var(--tr-navy)] mb-4">📡 HOST LIVE CLASS GAME</h2>
      <p className="text-sm text-[var(--tr-navy)]/70 mb-5">
        Pick a question set, choose the wrong-answer mode, and we'll generate a 6-character code your students can use to join.
      </p>

      <label className="block text-xs font-bold text-[var(--tr-navy)] mb-1">QUESTION SET</label>
      <select className="tr-input mb-4" value={setId} onChange={e => setSetId(e.target.value)}>
        {sets.map(s => <option key={s.id} value={s.id}>{s.title} ({s._count.questions} Qs · {s.gradeLevel})</option>)}
      </select>

      <label className="block text-xs font-bold text-[var(--tr-navy)] mb-1">WRONG ANSWER MODE</label>
      <div className="flex gap-3 mb-5">
        <button className={`flex-1 tr-btn ${mode === 'slow' ? '' : 'tr-btn-outline'}`} onClick={() => setMode('slow')}>
          🐢 SLOW DOWN
        </button>
        <button className={`flex-1 tr-btn ${mode === 'heart' ? '' : 'tr-btn-outline'}`} onClick={() => setMode('heart')}>
          💔 LOSE HEART
        </button>
      </div>

      <button className="tr-btn w-full" onClick={createRoom} disabled={creating || !setId}>
        {creating ? 'CREATING…' : '🚦 CREATE ROOM & HOST'}
      </button>
    </div>
  )
}

/* ============ HOMEWORK TAB ============ */

function HomeworkTab() {
  const [sets, setSets] = useState<Set[]>([])
  const [setId, setSetId] = useState('')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [list, setList] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  function loadList() {
    api<{ homework: any[] }>('/api/homework').then(r => setList(r.homework))
  }
  useEffect(() => {
    api<{ sets: Set[] }>('/api/sets').then(r => {
      setSets(r.sets)
      if (r.sets[0]) setSetId(r.sets[0].id)
    })
    loadList()
  }, [])

  async function create() {
    if (!title.trim() || !setId) { alert('Title and question set required'); return }
    setSaving(true)
    try {
      await api('/api/homework', {
        method: 'POST',
        body: JSON.stringify({ setId, title, dueDate: dueDate || null }),
      })
      setTitle(''); setDueDate('')
      loadList()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="tr-card p-6">
        <h2 className="tr-font-display text-xl text-[var(--tr-navy)] mb-4">📝 ASSIGN HOMEWORK</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-bold text-[var(--tr-navy)] mb-1">TITLE</label>
            <input className="tr-input" placeholder="e.g. Chapter 5 Review — Due Friday" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--tr-navy)] mb-1">DUE DATE (optional)</label>
            <input type="date" className="tr-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>
        <label className="block text-xs font-bold text-[var(--tr-navy)] mb-1">QUESTION SET</label>
        <select className="tr-input mb-4" value={setId} onChange={e => setSetId(e.target.value)}>
          {sets.map(s => <option key={s.id} value={s.id}>{s.title} ({s._count.questions} Qs)</option>)}
        </select>
        <button className="tr-btn" onClick={create} disabled={saving} style={{ padding: '10px 18px', fontSize: 14 }}>
          {saving ? 'SAVING…' : '📝 ASSIGN'}
        </button>
      </div>

      <div className="tr-card p-6">
        <h3 className="tr-font-display text-lg text-[var(--tr-navy)] mb-3">EXISTING HOMEWORK</h3>
        <div className="space-y-2">
          {list.map(h => (
            <div key={h.id} className="p-3 rounded-xl border-2 border-[var(--tr-navy)]/15 bg-white">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-extrabold text-[var(--tr-navy)]">{h.title}</h4>
                  <p className="text-xs text-[var(--tr-navy)]/60 font-semibold">
                    {h.set.title} · {h._count.submissions} submitted
                    {h.dueDate && ` · Due ${new Date(h.dueDate).toLocaleDateString()}`}
                  </p>
                </div>
                <span className="tr-chip">ID: {h.id.slice(-6)}</span>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center py-4 text-[var(--tr-navy)]/60">No homework assigned yet.</p>}
        </div>
      </div>
    </div>
  )
}

/* ============ RESULTS TAB ============ */

function ResultsTab() {
  const [list, setList] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)

  useEffect(() => {
    api<{ homework: any[] }>('/api/homework').then(r => setList(r.homework))
  }, [])

  useEffect(() => {
    if (!selected) { setResult(null); return }
    api<{ homework: any }>(`/api/homework/${selected}/results`).then(r => setResult(r.homework))
  }, [selected])

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="tr-card p-4 md:col-span-1">
        <h3 className="tr-font-display text-lg text-[var(--tr-navy)] mb-3">SELECT HOMEWORK</h3>
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {list.map(h => (
            <button
              key={h.id}
              onClick={() => setSelected(h.id)}
              className={`w-full text-left p-2 rounded-lg transition-all ${
                selected === h.id ? 'bg-[var(--tr-yellow)]' : 'hover:bg-[var(--tr-cream)]'
              }`}
            >
              <div className="font-bold text-[var(--tr-navy)] text-sm">{h.title}</div>
              <div className="text-xs text-[var(--tr-navy)]/60">{h._count.submissions} submissions</div>
            </button>
          ))}
          {list.length === 0 && <p className="text-sm text-[var(--tr-navy)]/60">No homework yet.</p>}
        </div>
      </div>

      <div className="md:col-span-2">
        {result ? (
          <div className="tr-card p-6">
            <h2 className="tr-font-display text-xl text-[var(--tr-navy)] mb-1">{result.title}</h2>
            <p className="text-sm text-[var(--tr-navy)]/70 mb-4">
              {result.setTitle} · {result.submissions.length} submissions
              {result.dueDate && ` · Due ${new Date(result.dueDate).toLocaleDateString()}`}
            </p>

            {result.submissions.length === 0 ? (
              <p className="text-center py-6 text-[var(--tr-navy)]/60">No submissions yet.</p>
            ) : (
              <>
                {/* Aggregate stats */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {(() => {
                    const ss = result.submissions
                    const avg = ss.reduce((a: number, s: any) => a + s.score, 0) / ss.length
                    const high = Math.max(...ss.map((s: any) => s.score))
                    const low = Math.min(...ss.map((s: any) => s.score))
                    return (
                      <>
                        <StatBox label="Average" value={Math.round(avg).toString()} />
                        <StatBox label="High" value={high.toString()} />
                        <StatBox label="Low" value={low.toString()} />
                      </>
                    )
                  })()}
                </div>

                {/* Submissions list */}
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {result.submissions.map((s: any, i: number) => (
                    <details key={s.id} className="bg-[var(--tr-cream)] rounded-lg p-3">
                      <summary className="cursor-pointer flex items-center justify-between">
                        <span className="font-bold text-[var(--tr-navy)]">
                          {i + 1 <= 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`} {s.playerName}
                        </span>
                        <span className="tr-font-display text-[var(--tr-navy)]">{s.score}</span>
                      </summary>
                      <div className="mt-2 text-sm grid grid-cols-2 gap-1">
                        <div>✅ Correct: <b>{s.correct}</b></div>
                        <div>❌ Wrong: <b>{s.wrong}</b></div>
                        <div>🔥 Best streak: <b>×{s.bestStreak}</b></div>
                        <div>🪙 Coins: <b>{s.coins}</b></div>
                      </div>
                      {s.mistakes.length > 0 && (
                        <div className="mt-2 text-xs">
                          <p className="font-bold text-[var(--tr-red)] mb-1">Mistakes to review:</p>
                          <ul className="list-disc ml-5 space-y-0.5 text-[var(--tr-navy)]/70">
                            {s.mistakes.map((m: any, j: number) => (
                              <li key={j}>{m.q} — picked "<b>{m.picked}</b>", correct: "<b>{m.answer}</b>"</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </details>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="tr-card p-8 text-center">
            <div className="text-4xl mb-3">👈</div>
            <p className="font-bold text-[var(--tr-navy)]/70">Pick a homework to view results.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--tr-cream)] rounded-xl p-3 text-center">
      <div className="text-xs text-[var(--tr-navy)]/60 font-bold">{label}</div>
      <div className="tr-font-display text-2xl tr-grad-text">{value}</div>
    </div>
  )
}
