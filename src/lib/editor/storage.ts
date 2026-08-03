import type { Project } from '@/lib/runtime'

const PREFIX = 'gf:project:'
const INDEX_KEY = 'gf:projects'

export interface ProjectMeta {
  id: string
  name: string
  updatedAt: number
  thumbnail?: string
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function listProjects(): ProjectMeta[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as ProjectMeta[]
    return arr.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export function saveProject(id: string, project: Project): ProjectMeta {
  if (!isBrowser()) throw new Error('saveProject called outside browser')
  const updatedAt = Date.now()
  window.localStorage.setItem(PREFIX + id, JSON.stringify({ ...project, _id: id, _updatedAt: updatedAt }))

  const projects = listProjects()
  const existingIdx = projects.findIndex((p) => p.id === id)
  const meta: ProjectMeta = { id, name: project.name, updatedAt }
  if (existingIdx >= 0) projects[existingIdx] = meta
  else projects.push(meta)
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(projects))
  return meta
}

export function loadProject(id: string): Project | null {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(PREFIX + id)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const { _id, _updatedAt, ...project } = parsed
    return project as Project
  } catch {
    return null
  }
}

export function deleteProject(id: string): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(PREFIX + id)
  const projects = listProjects().filter((p) => p.id !== id)
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(projects))
}

export function newProjectId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
