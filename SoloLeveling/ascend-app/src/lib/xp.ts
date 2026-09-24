// XP Required = 100 * Level^1.5 (README 2.2)
export function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

export interface LevelUpResult {
  level: number
  xp: number
  levelsGained: number
}

export function applyXp(level: number, xp: number, gained: number): LevelUpResult {
  let newLevel = level
  let newXp = xp + gained
  let levelsGained = 0

  let threshold = xpToNextLevel(newLevel)
  while (newXp >= threshold && newLevel < 100) {
    newXp -= threshold
    newLevel += 1
    levelsGained += 1
    threshold = xpToNextLevel(newLevel)
  }

  return { level: newLevel, xp: newXp, levelsGained }
}

export function rankForLevel(level: number): string {
  if (level >= 100) return 'ASCENDED'
  if (level >= 70) return 'S'
  if (level >= 50) return 'A'
  if (level >= 35) return 'B'
  if (level >= 20) return 'C'
  if (level >= 10) return 'D'
  if (level >= 5) return 'E'
  return 'F'
}
