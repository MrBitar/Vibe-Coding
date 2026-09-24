export type StatKey =
  | 'discipline'
  | 'knowledge'
  | 'health'
  | 'creativity'
  | 'social'
  | 'wealth'
  | 'focus'

export type Stats = Record<StatKey, number>

export type FocusArea =
  | 'Health'
  | 'Knowledge'
  | 'Career'
  | 'Money'
  | 'Confidence'
  | 'Creativity'
  | 'Relationships'

export const FOCUS_TO_STAT: Record<FocusArea, StatKey> = {
  Health: 'health',
  Knowledge: 'knowledge',
  Career: 'focus',
  Money: 'wealth',
  Confidence: 'discipline',
  Creativity: 'creativity',
  Relationships: 'social',
}

export const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'ASCENDED'] as const
export type Rank = (typeof RANKS)[number]

export interface Quest {
  id: string
  title: string
  description: string
  xp: number
  primaryStat: StatKey
  secondaryStat?: StatKey
  completed: boolean
}

export interface Player {
  name: string
  title: string
  class: string
  level: number
  xp: number
  gold: number
  stats: Stats
  focusAreas: FocusArea[]
  questsCompletedTotal: number
  streak: number
  lastActiveDate: string
  mainQuestComplete: boolean
  createdAt: string
}

export interface GameState {
  player: Player
  dailyQuests: Quest[]
}
