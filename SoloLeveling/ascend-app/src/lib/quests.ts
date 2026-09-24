import type { FocusArea, Quest, StatKey } from '../types'
import { FOCUS_TO_STAT } from '../types'

// Templates pulled from README Chapter 2.2 (XP Sources) / 3.1 (Daily Quests)
const QUEST_TEMPLATES: Record<StatKey, Omit<Quest, 'id' | 'completed'>[]> = {
  knowledge: [
    { title: 'Study 30 minutes', description: 'Spend focused time learning something new.', xp: 100, primaryStat: 'knowledge', secondaryStat: 'discipline' },
    { title: 'Read 10 pages', description: 'Read from a book relevant to your goals.', xp: 50, primaryStat: 'knowledge' },
  ],
  health: [
    { title: 'Workout', description: 'Complete a training session.', xp: 100, primaryStat: 'health', secondaryStat: 'discipline' },
    { title: 'Drink water', description: 'Stay hydrated today.', xp: 20, primaryStat: 'health' },
  ],
  focus: [
    { title: 'Deep Work session', description: 'Work on your career goals with zero distractions.', xp: 150, primaryStat: 'focus', secondaryStat: 'discipline' },
    { title: 'Task completed', description: 'Finish one meaningful task.', xp: 50, primaryStat: 'focus' },
  ],
  wealth: [
    { title: 'Review your budget', description: 'Check spending and savings progress.', xp: 50, primaryStat: 'wealth' },
    { title: 'Learn a money skill', description: 'Read or watch something about finance.', xp: 100, primaryStat: 'wealth', secondaryStat: 'knowledge' },
  ],
  discipline: [
    { title: 'Meditate', description: 'Spend a few quiet minutes with your thoughts.', xp: 30, primaryStat: 'discipline' },
    { title: 'Wake up on time', description: 'Start the day the way you planned.', xp: 30, primaryStat: 'discipline' },
  ],
  creativity: [
    { title: 'Work on a personal project', description: 'Make progress on something you are building.', xp: 150, primaryStat: 'creativity', secondaryStat: 'discipline' },
    { title: 'Create something small', description: 'Sketch, write, or prototype an idea.', xp: 50, primaryStat: 'creativity' },
  ],
  social: [
    { title: 'Social activity', description: 'Reach out to or spend time with someone.', xp: 50, primaryStat: 'social' },
    { title: 'Have a real conversation', description: 'Talk to someone about more than small talk.', xp: 50, primaryStat: 'social' },
  ],
}

let idCounter = 0
function nextId(): string {
  idCounter += 1
  return `quest-${Date.now()}-${idCounter}`
}

export function generateStarterQuests(focusAreas: FocusArea[]): Quest[] {
  const stats = Array.from(new Set(focusAreas.map((f) => FOCUS_TO_STAT[f])))
  const quests: Quest[] = []

  for (const stat of stats) {
    const template = QUEST_TEMPLATES[stat][0]
    quests.push({ ...template, id: nextId(), completed: false })
  }

  return quests
}

export function generateFreshDailyQuests(dailyQuests: Quest[]): Quest[] {
  return dailyQuests.map((q) => ({ ...q, completed: false }))
}
