'use client'

import { useEditorStore } from '@/lib/editor/store'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  createProject,
  loadProjectForEdit,
  updateProject,
  setProjectPublished,
  getEditToken,
  storeEditToken,
  type LoadedProject,
} from '@/lib/editor/storage-server'
import type { Project } from '@/lib/runtime'

type ServerState =
  | { status: 'new' }                          // not yet saved to server
  | { status: 'synced'; serverId: string; isPublic: boolean; version: number }
  | { status: 'readonly'; serverId: string; isPublic: boolean; version: number }
  | { status: 'loading' }
  | { status: 'error'; message: string }

function toServerProject(project: Project): Project {
  // The store-level Project IS the .gfpkg payload. Pass through.
  return project
}

function applyLoadedToStore(loaded: LoadedProject, setProject: (p: Project) => void, setProjectName: (n: string) => void) {
  setProject(loaded.data)
  // The .gfpkg payload's `name` field is canonical — sync the toolbar input to it.
  setProjectName(loaded.data.name)
}

export function Toolbar({ projectId }: { projectId: string | null }) {
  const router = useRouter()
  const project = useEditorStore((s) => s.project)
  const markSaved = useEditorStore((s) => s.markSaved)
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt)
  const setProjectName = useEditorStore((s) => s.setProjectName)
  const setProject = useEditorStore((s) => s.setProject)
  const newProject = useEditorStore((s) => s.newProject)

  const [status, setStatus] = useState<string>('')
  const [server, setServer] = useState<ServerState>({ status: 'new' })
  const [saving, setSaving] = useState(false)

  // Load on mount if projectId is provided.
  useEffect(() => {
    if (!projectId) {
      queueMicrotask(() => {
        newProject()
        setServer({ status: 'new' })
      })
      return
    }
    queueMicrotask(() => setServer({ status: 'loading' }))
    loadProjectForEdit(projectId)
      .then((loaded) => {
        queueMicrotask(() => {
          applyLoadedToStore(loaded, setProject, setProjectName)
          setServer({
            status: loaded.owns ? 'synced' : 'readonly',
            serverId: loaded.id,
            isPublic: loaded.isPublic,
            version: loaded.version,
          })
          setStatus(`Loaded "${loaded.title}"`)
        })
      })
      .catch((e: Error) => {
        queueMicrotask(() => {
          setServer({ status: 'error', message: e.message })
          setStatus(`Load failed: ${e.message}`)
        })
      })
  }, [projectId, setProject, setProjectName, newProject])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setStatus('')
    try {
      if (server.status === 'synced') {
        // Update existing project.
        await updateProject(server.serverId, {
          title: project.name,
          data: toServerProject(project),
        })
        markSaved()
        setStatus('Saved to server')
      } else if (server.status === 'new') {
        // Create a new project.
        const created = await createProject({
          title: project.name,
          data: toServerProject(project),
          isPublic: false,
        })
        storeEditToken(created.id, created.editToken)
        setServer({
          status: 'synced',
          serverId: created.id,
          isPublic: created.isPublic,
          version: created.version,
        })
        markSaved()
        setStatus('Created on server')
        // Replace URL so subsequent saves reuse the same id.
        router.replace(`/editor?id=${created.id}`)
      } else if (server.status === 'readonly') {
        setStatus("Can't save — you don't own this project. Fork it first (Phase 1.5+).")
      }
    } catch (e) {
      setStatus(`Save failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }, [server, project, markSaved, router])

  const handlePlay = useCallback(async () => {
    // Ensure the latest changes are saved before navigating to /play.
    if (server.status === 'synced') {
      try {
        await updateProject(server.serverId, {
          title: project.name,
          data: toServerProject(project),
        })
        markSaved()
      } catch (e) {
        setStatus(`Save before play failed: ${(e as Error).message}`)
        return
      }
      router.push(`/play/${server.serverId}`)
      return
    }
    if (server.status === 'new') {
      try {
        const created = await createProject({
          title: project.name,
          data: toServerProject(project),
          isPublic: false,
        })
        storeEditToken(created.id, created.editToken)
        setServer({
          status: 'synced',
          serverId: created.id,
          isPublic: created.isPublic,
          version: created.version,
        })
        markSaved()
        router.push(`/play/${created.id}`)
      } catch (e) {
        setStatus(`Save before play failed: ${(e as Error).message}`)
      }
    } else if (server.status === 'readonly') {
      // Play the published version — read-only viewers can still play.
      router.push(`/play/${server.serverId}`)
    }
  }, [server, project, markSaved, router])

  const handleTogglePublish = useCallback(async () => {
    if (server.status !== 'synced') {
      setStatus('Save the project first, then publish.')
      return
    }
    setSaving(true)
    try {
      // Save the latest changes first so publishedData matches what the
      // user is currently seeing.
      await updateProject(server.serverId, {
        title: project.name,
        data: toServerProject(project),
      })
      const next = await setProjectPublished(server.serverId, !server.isPublic)
      setServer({ ...server, isPublic: next.isPublic, version: next.version })
      markSaved()
      setStatus(next.isPublic ? 'Published — share link is live!' : 'Unpublished')
    } catch (e) {
      setStatus(`Publish failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }, [server, project, markSaved])

  const handleCopyShareLink = useCallback(async () => {
    if (server.status !== 'synced') {
      setStatus('Save first to get a share link.')
      return
    }
    if (!server.isPublic) {
      setStatus('Publish first to get a shareable link.')
      return
    }
    const url = `${window.location.origin}/play/${server.serverId}`
    try {
      await navigator.clipboard.writeText(url)
      setStatus('Share link copied to clipboard')
    } catch {
      setStatus(`Share link: ${url}`)
    }
  }, [server])

  const canEdit = server.status === 'new' || server.status === 'synced'
  const isPublic = server.status === 'synced' || server.status === 'readonly' ? server.isPublic : false

  return (
    <header className="flex h-14 flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-950 px-4">
      <a href="/" className="font-display text-lg font-black tracking-wide text-teal-400 hover:text-teal-300">
        GameForge
      </a>
      <span className="text-xs uppercase tracking-widest text-slate-500">Editor</span>

      <input
        value={project.name}
        onChange={(e) => setProjectName(e.target.value)}
        disabled={!canEdit}
        className="w-64 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Project name"
      />

      {/* Server status chip */}
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          server.status === 'synced'
            ? 'bg-emerald-500/15 text-emerald-300'
            : server.status === 'readonly'
              ? 'bg-amber-500/15 text-amber-300'
              : server.status === 'loading'
                ? 'bg-slate-500/15 text-slate-300'
                : 'bg-slate-500/15 text-slate-400'
        }`}
        title={server.status === 'error' ? server.message : undefined}
      >
        {server.status === 'synced' && (isPublic ? 'Public' : 'Private')}
        {server.status === 'readonly' && 'Read-only'}
        {server.status === 'loading' && 'Loading…'}
        {server.status === 'new' && 'Unsaved'}
        {server.status === 'error' && 'Error'}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {status && <span className="text-xs text-slate-400">{status}</span>}
        {lastSavedAt && (
          <span className="hidden text-xs text-slate-600 sm:inline">
            Saved {new Date(lastSavedAt).toLocaleTimeString()}
          </span>
        )}

        <button
          onClick={handleTogglePublish}
          disabled={!canEdit || saving}
          className={`rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-40 ${
            isPublic
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
              : 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
          }`}
          title={isPublic ? 'Click to unpublish' : 'Publish to get a shareable link'}
        >
          {isPublic ? 'Unpublish' : 'Publish'}
        </button>

        {isPublic && (
          <button
            onClick={handleCopyShareLink}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700"
            title="Copy share link to clipboard"
          >
            Copy link
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={!canEdit || saving}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={handlePlay}
          disabled={saving}
          className="rounded-md bg-teal-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-40"
        >
          Play ▶
        </button>
      </div>
    </header>
  )
}
