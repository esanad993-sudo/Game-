'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { loadPublishedProject, loadProjectForEdit } from '@/lib/editor/storage-server'
import { SceneRuntime, DeviceRegistry, BUILTIN_DEVICES, ProjectSchema, type Project, type DeviceInstance } from '@/lib/runtime'

interface MessageToast {
  id: number
  text: string
}

export default function PlayPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [projectTitle, setProjectTitle] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [runtime, setRuntime] = useState<SceneRuntime | null>(null)
  const [tick, setTick] = useState(0)
  const [messages, setMessages] = useState<MessageToast[]>([])
  const msgIdRef = useRef(0)

  const installMessageInterceptor = useCallback(() => {
    const original = console.log
    console.log = (...args: any[]) => {
      const m = args.find((a) => typeof a === 'string' && a.startsWith('ShowMessage:'))
      if (m) {
        const match = m.match(/"(.+?)"/)
        if (match) {
          const id = ++msgIdRef.current
          setMessages((prev) => [...prev, { id, text: match[1] }])
          setTimeout(() => {
            setMessages((prev) => prev.filter((m) => m.id !== id))
          }, 2500)
        }
      }
      original(...args)
    }
    return () => {
      console.log = original
    }
  }, [])

  useEffect(() => {
    if (!params.projectId) return
    let cancelled = false

    // Try the published endpoint first (works for anonymous visitors on
    // shared links). Falls back to the edit endpoint if the visitor owns
    // the project (so they can play their own draft).
    loadPublishedProject(params.projectId)
      .catch(() => null)
      .then(async (pub) => {
        if (cancelled) return
        if (pub) return pub
        // Fall back to edit-mode load if the user owns this project.
        try {
          return await loadProjectForEdit(params.projectId)
        } catch {
          return null
        }
      })
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) {
          queueMicrotask(() => setError(`Project not found or not published: ${params.projectId}`))
          return
        }
        try {
          const parsed = ProjectSchema.parse(loaded.data)
          queueMicrotask(() => {
            setProject(parsed)
            setProjectTitle(loaded.title || parsed.name)
            const registry = new DeviceRegistry()
            registry.registerAll(BUILTIN_DEVICES)
            const rt = new SceneRuntime(parsed, registry)
            rt.start()
            setRuntime(rt)
          })
        } catch (e) {
          queueMicrotask(() => setError(`Failed to parse project: ${(e as Error).message}`))
        }
      })

    const restore = installMessageInterceptor()
    return () => {
      cancelled = true
      restore()
    }
  }, [params.projectId, installMessageInterceptor])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const snapshot = runtime ? runtime.snapshot() : { world: [], deviceStates: [] }

  const triggerButton = useCallback(
    (instance: DeviceInstance) => {
      if (!runtime) return
      runtime.trigger(instance.id, 'onPress', { pressedAt: Date.now() })
      refresh()
    },
    [runtime, refresh],
  )

  // Suppress unused-warning while we keep tick for re-render on refresh.
  void tick

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-300">
        <p className="text-rose-400">{error}</p>
        <button
          onClick={() => router.push('/editor')}
          className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400"
        >
          Back to editor
        </button>
      </div>
    )
  }

  if (!project || !runtime) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-500">
        Loading…
      </div>
    )
  }

  const devices = project.scene.devices
  const buttons = devices.filter((d) => d.type === 'button')
  const counters = devices.filter((d) => d.type === 'counter')
  const entities = snapshot.world

  const counterValue = (id: string): number | undefined =>
    snapshot.deviceStates.find((d) => d.id === id)?.state.value

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex h-14 items-center gap-4 border-b border-slate-800 px-4">
        <a href="/editor" className="font-display text-lg font-black text-teal-400 hover:text-teal-300">
          GameForge
        </a>
        <span className="text-xs uppercase tracking-widest text-slate-500">Playing</span>
        <span className="text-sm font-medium">{projectTitle || project.name}</span>
        <button
          onClick={() => router.push(`/editor?id=${params.projectId}`)}
          className="ml-auto rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
        >
          ← Edit
        </button>
      </header>

      <div
        className="relative flex-1 overflow-hidden"
        style={{ backgroundColor: project.scene.world.background }}
      >
        {entities.map((e) => (
          <div
            key={e.id}
            className="absolute flex flex-col items-center"
            style={{
              left: (e.components.position?.[0] ?? 100) - 24,
              top: (e.components.position?.[1] ?? 100) - 24,
            }}
          >
            <div className="h-12 w-12 rounded-full border-2 border-teal-400 bg-teal-500/40 shadow-lg shadow-teal-500/30" />
            <span className="mt-1 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-100">
              {e.components.name ?? e.id}
            </span>
            {typeof e.components.coins === 'number' && (
              <span className="mt-0.5 rounded bg-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-200">
                🪙 {e.components.coins}
              </span>
            )}
          </div>
        ))}

        {buttons.map((b) => (
          <button
            key={b.id}
            onClick={() => triggerButton(b)}
            className="absolute rounded-lg border-2 border-emerald-400 bg-emerald-500/30 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-lg transition hover:bg-emerald-500/50 active:scale-95"
            style={{ left: b.position[0], top: b.position[1] }}
          >
            🔘 {b.properties.label ?? 'Press'}
          </button>
        ))}

        {counters.map((c) => {
          const v = counterValue(c.id) ?? c.properties.initialValue ?? 0
          const threshold = c.properties.threshold ?? 1
          const pct = Math.min(100, (v / threshold) * 100)
          return (
            <div
              key={c.id}
              className="absolute w-44 rounded-lg border-2 border-sky-400 bg-slate-950/80 p-3 text-center shadow-lg"
              style={{ left: c.position[0], top: c.position[1] }}
            >
              <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">Counter</p>
              <p className="font-mono text-2xl font-bold text-sky-300">
                {v}
                <span className="ml-1 text-sm text-slate-500">/ {threshold}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-sky-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}

        {devices.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <p className="mb-2 text-lg">This scene is empty.</p>
              <button
                onClick={() => router.push('/editor')}
                className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400"
              >
                Open editor
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className="animate-pulse rounded-lg border border-amber-400/40 bg-slate-950/90 px-5 py-2.5 text-sm font-medium text-amber-100 shadow-xl"
          >
            💬 {m.text}
          </div>
        ))}
      </div>
    </div>
  )
}
