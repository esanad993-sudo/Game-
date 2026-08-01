'use client'
import { create } from 'zustand'

export type View =
  | { name: 'menu' }
  | { name: 'solo' }
  | { name: 'join'; code?: string }
  | { name: 'live-play'; code: string; playerId: string; playerName: string; isHost: boolean }
  | { name: 'homework-list' }
  | { name: 'homework-play'; id: string; playerName: string }
  | { name: 'teacher' }

interface NavState {
  view: View
  go: (v: View) => void
  back: () => void
  history: View[]
}

export const useNav = create<NavState>((set, get) => ({
  view: { name: 'menu' },
  history: [],
  go: (v) => set((s) => ({ view: v, history: [...s.history, s.view] })),
  back: () => {
    const h = [...get().history]
    const prev = h.pop()
    if (prev) set({ view: prev, history: h })
    else set({ view: { name: 'menu' }, history: [] })
  },
}))

// Persist player name across views
const NAME_KEY = 'tr_player_name'
export function getSavedName(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(NAME_KEY) || ''
}
export function saveName(n: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(NAME_KEY, n.slice(0, 14))
}
