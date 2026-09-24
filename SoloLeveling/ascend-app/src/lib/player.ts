import type { FocusArea, Player, Stats } from '../types'
import { FOCUS_TO_STAT } from '../types'

const BASE_STAT = 3

export function createPlayer(name: string, focusAreas: FocusArea[], assessments: Partial<Record<FocusArea, number>>): Player {
  const stats: Stats = {
    discipline: BASE_STAT,
    knowledge: BASE_STAT,
    health: BASE_STAT,
    creativity: BASE_STAT,
    social: BASE_STAT,
    wealth: BASE_STAT,
    focus: BASE_STAT,
  }

  for (const focus of focusAreas) {
    const stat = FOCUS_TO_STAT[focus]
    const selfRating = assessments[focus] ?? 3
    stats[stat] = selfRating
  }

  return {
    name: name || 'Player',
    title: 'The Awakened',
    class: 'Unknown',
    level: 1,
    xp: 0,
    gold: 0,
    stats,
    focusAreas,
    questsCompletedTotal: 0,
    streak: 0,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    mainQuestComplete: false,
    createdAt: new Date().toISOString(),
  }
}
