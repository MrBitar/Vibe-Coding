import type { GameState } from '../types'

const STORAGE_KEY = 'ascend-save'

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as GameState
  } catch {
    return null
  }
}

export function saveGame(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearGame(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}
