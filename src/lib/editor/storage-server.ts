import type { Project } from '@/lib/runtime'

// ─── Token storage ───────────────────────────────────────────────────────
// The edit token is the client's proof of ownership for anonymous projects.
// We keep a map of {projectId → editToken} in localStorage.

const TOKEN_PREFIX = 'gf:edit:'
const TOKEN_INDEX = 'gf:edit-tokens'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getTokens(): Record<string, string> {
  if (!isBrowser()) return {}
  try {
    return JSON.parse(window.localStorage.getItem(TOKEN_INDEX) ?? '{}')
  } catch {
    return {}
  }
}

function writeTokens(map: Record<string, string>): void {
  if (!isBrowser()) return
  window.localStorage.setItem(TOKEN_INDEX, JSON.stringify(map))
}

export function storeEditToken(projectId: string, token: string): void {
  const map = getTokens()
  map[projectId] = token
  writeTokens(map)
}

export function getEditToken(projectId: string): string | null {
  return getTokens()[projectId] ?? null
}

export function forgetEditToken(projectId: string): void {
  const map = getTokens()
  delete map[projectId]
  writeTokens(map)
}

// ─── API types ───────────────────────────────────────────────────────────

export interface ProjectSummary {
  id: string
  title: string
  description: string | null
  isPublic: boolean
  version: number
  playCount: number
  forkCount: number
  updatedAt: string
  authorId: string | null
  // Client-only: did we create this (have the edit token)?
  owns: boolean
}

export interface LoadedProject {
  id: string
  title: string
  description: string | null
  version: number
  isPublic: boolean
  playCount?: number
  forkCount?: number
  data: Project
  updatedAt?: string
  owns: boolean
}

// ─── API helpers ─────────────────────────────────────────────────────────

async function api(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  return res
}

// ─── CRUD ────────────────────────────────────────────────────────────────

export async function createProject(opts: {
  title: string
  description?: string
  data: Project
  isPublic?: boolean
}): Promise<{ id: string; editToken: string; isPublic: boolean; version: number; createdAt: string }> {
  const res = await api('/api/projects', {
    method: 'POST',
    body: JSON.stringify({
      title: opts.title,
      description: opts.description,
      data: opts.data,
      isPublic: opts.isPublic ?? false,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create project' }))
    throw new Error(err.error ?? 'Failed to create project')
  }
  const created = await res.json()
  // Persist the edit token so subsequent edits don't require re-entry.
  storeEditToken(created.id, created.editToken)
  return created
}

export async function listProjects(scope: 'mine' | 'public' | 'all' = 'all'): Promise<ProjectSummary[]> {
  const res = await api(`/api/projects?scope=${scope}`)
  if (!res.ok) throw new Error('Failed to list projects')
  const { projects } = (await res.json()) as { projects: Omit<ProjectSummary, 'owns'>[] }
  // Mark which ones we own based on stored edit tokens.
  return projects.map((p) => ({ ...p, owns: !!getEditToken(p.id) }))
}

export async function loadProjectForEdit(id: string): Promise<LoadedProject> {
  const token = getEditToken(id)
  const res = await api(`/api/projects/${id}`, {
    headers: token ? { 'X-Edit-Token': token } : {},
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to load project' }))
    throw new Error(err.error ?? 'Failed to load project')
  }
  const body = await res.json()
  return {
    id: body.id,
    title: body.title,
    description: body.description,
    version: body.version,
    isPublic: body.isPublic,
    playCount: body.playCount,
    forkCount: body.forkCount,
    data: JSON.parse(body.data),
    updatedAt: body.updatedAt,
    owns: !!token,
  }
}

export async function loadPublishedProject(id: string): Promise<LoadedProject | null> {
  const res = await api(`/api/projects/${id}?view=published`)
  if (!res.ok) return null
  const body = await res.json()
  return {
    id: body.id,
    title: body.title,
    description: body.description,
    version: body.version,
    playCount: body.playCount,
    isPublic: true,
    data: JSON.parse(body.data),
    owns: false,
  }
}

export async function updateProject(
  id: string,
  patch: { title?: string; description?: string | null; data?: Project },
): Promise<{ id: string; title: string; version: number; isPublic: boolean; updatedAt: string }> {
  const token = getEditToken(id)
  const res = await api(`/api/projects/${id}`, {
    method: 'PUT',
    headers: token ? { 'X-Edit-Token': token } : {},
    body: JSON.stringify({ ...patch, editToken: token }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update project' }))
    throw new Error(err.error ?? 'Failed to update project')
  }
  return res.json()
}

export async function deleteProject(id: string): Promise<void> {
  const token = getEditToken(id)
  const res = await api(`/api/projects/${id}`, {
    method: 'DELETE',
    headers: token ? { 'X-Edit-Token': token } : {},
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete project' }))
    throw new Error(err.error ?? 'Failed to delete project')
  }
  forgetEditToken(id)
}

export async function setProjectPublished(id: string, publish: boolean): Promise<{
  id: string
  title?: string
  isPublic: boolean
  version: number
}> {
  const token = getEditToken(id)
  const res = await api(`/api/projects/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify({ publish, editToken: token }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to change publish status' }))
    throw new Error(err.error ?? 'Failed to change publish status')
  }
  return res.json()
}
