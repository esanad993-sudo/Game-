'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listProjects, type ProjectSummary } from '@/lib/editor/storage-server'

export default function GalleryPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    listProjects('public')
      .then((list) => {
        if (cancelled) return
        setProjects(list)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(e.message)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex h-14 items-center gap-4 border-b border-slate-800 px-6">
        <a href="/" className="font-display text-lg font-black text-teal-400">GameForge</a>
        <span className="text-xs uppercase tracking-widest text-slate-500">Gallery</span>
        <button
          onClick={() => router.push('/editor')}
          className="ml-auto rounded-md bg-teal-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-teal-400"
        >
          + New project
        </button>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        <h1 className="mb-1 text-2xl font-bold">Public Games</h1>
        <p className="mb-6 text-sm text-slate-500">
          Browse community-published games. Click any card to play it instantly — no account required.
        </p>

        {loading && <p className="text-slate-400">Loading…</p>}
        {error && <p className="text-rose-400">Failed to load: {error}</p>}

        {!loading && !error && projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-700 p-12 text-center">
            <p className="mb-2 text-slate-300">No published games yet.</p>
            <p className="mb-4 text-sm text-slate-500">
              Build a scene in the editor and hit Publish to share it with the world.
            </p>
            <button
              onClick={() => router.push('/editor')}
              className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400"
            >
              Open editor →
            </button>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/play/${p.id}`)}
                className="group flex flex-col rounded-lg border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-teal-500/50 hover:bg-slate-900/80"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-semibold text-slate-100 group-hover:text-teal-300">{p.title}</h3>
                  {p.owns && (
                    <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                      Yours
                    </span>
                  )}
                </div>
                <p className="mb-3 line-clamp-2 flex-1 text-xs text-slate-500">
                  {p.description || 'No description provided.'}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-slate-600">
                  <span title="Play count">▶ {p.playCount}</span>
                  <span title="Version">v{p.version}</span>
                  <span className="ml-auto">
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
