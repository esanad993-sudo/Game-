'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listProjects, deleteProject, type ProjectSummary } from '@/lib/editor/storage-server'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      setLoading(true)
      setError('')
    })
    listProjects('all')
      .then((list) => {
        if (cancelled) return
        queueMicrotask(() => {
          setProjects(list)
          setLoading(false)
        })
      })
      .catch((e: Error) => {
        if (cancelled) return
        queueMicrotask(() => {
          setError(e.message)
          setLoading(false)
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = () => {
    setLoading(true)
    setError('')
    listProjects('all')
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This permanently removes it from the server.`)) return
    try {
      await deleteProject(id)
      refresh()
    } catch (e) {
      alert(`Delete failed: ${(e as Error).message}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex h-14 items-center gap-4 border-b border-slate-800 px-6">
        <a href="/" className="font-display text-lg font-black text-teal-400">GameForge</a>
        <span className="text-xs uppercase tracking-widest text-slate-500">My Projects</span>
        <a
          href="/gallery"
          className="ml-4 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
        >
          Public Gallery →
        </a>
        <button
          onClick={() => router.push('/editor')}
          className="ml-auto rounded-md bg-teal-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-teal-400"
        >
          + New project
        </button>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {loading && <p className="text-slate-400">Loading…</p>}
        {error && <p className="text-rose-400">Failed to load: {error}</p>}

        {!loading && !error && projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-700 p-12 text-center">
            <p className="mb-2 text-slate-300">No projects yet.</p>
            <p className="mb-4 text-sm text-slate-500">
              Build a scene in the editor and save it to see it here.
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group flex flex-col rounded-lg border border-slate-800 bg-slate-900 p-4 transition hover:border-teal-500/50"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-100">{p.title}</h3>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                      p.isPublic
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-slate-500/15 text-slate-400'
                    }`}
                    title={p.isPublic ? 'Anyone can play via share link' : 'Only you can play this'}
                  >
                    {p.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <p className="mb-3 line-clamp-2 flex-1 text-xs text-slate-500">
                  {p.description || 'No description provided.'}
                </p>
                <div className="mb-3 flex items-center gap-3 text-[10px] text-slate-600">
                  <span title="Play count">▶ {p.playCount}</span>
                  <span title="Version">v{p.version}</span>
                  <span className="ml-auto">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/play/${p.id}`)}
                    className="flex-1 rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-400"
                  >
                    Play ▶
                  </button>
                  <button
                    onClick={() => router.push(`/editor?id=${p.id}`)}
                    className={`flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${
                      p.owns ? '' : 'cursor-not-allowed opacity-50'
                    }`}
                    title={p.owns ? 'Edit' : 'Read-only — you do not own this project'}
                    disabled={!p.owns}
                  >
                    {p.owns ? 'Edit' : 'View'}
                  </button>
                  {p.owns && (
                    <button
                      onClick={() => handleDelete(p.id, p.title)}
                      className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
                      title="Delete"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
