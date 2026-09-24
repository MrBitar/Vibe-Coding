import { useState } from 'react'
import type { GameState, StatKey } from '../types'
import { applyXp, rankForLevel } from '../lib/xp'
import StatBar from './StatBar'
import XpBar from './XpBar'
import QuestList from './QuestList'

const STAT_KEYS: StatKey[] = ['discipline', 'knowledge', 'health', 'creativity', 'social', 'wealth', 'focus']

export default function Dashboard({
  game,
  onChange,
}: {
  game: GameState
  onChange: (game: GameState) => void
}) {
  const [toast, setToast] = useState<string | null>(null)
  const { player, dailyQuests } = game

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  function completeQuest(id: string) {
    const quest = dailyQuests.find((q) => q.id === id)
    if (!quest || quest.completed) return

    const result = applyXp(player.level, player.xp, quest.xp)

    const stats = { ...player.stats }
    stats[quest.primaryStat] += 1
    if (quest.secondaryStat) stats[quest.secondaryStat] += 1

    const updatedPlayer = {
      ...player,
      level: result.level,
      xp: result.xp,
      stats,
      gold: player.gold + Math.round(quest.xp / 10),
      questsCompletedTotal: player.questsCompletedTotal + 1,
    }

    const updatedQuests = dailyQuests.map((q) => (q.id === id ? { ...q, completed: true } : q))

    onChange({ player: updatedPlayer, dailyQuests: updatedQuests })

    if (result.levelsGained > 0) {
      showToast(`LEVEL UP! Level ${player.level} → Level ${result.level}`)
    } else {
      showToast(`+${quest.xp} XP`)
    }
  }

  function completeMainQuest() {
    if (player.mainQuestComplete) return
    onChange({
      ...game,
      player: { ...player, mainQuestComplete: true, gold: player.gold + 50 },
    })
    showToast('MAIN QUEST COMPLETE: Discover Your Path')
  }

  const rank = rankForLevel(player.level)
  const allDailiesDone = dailyQuests.length > 0 && dailyQuests.every((q) => q.completed)

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 hud-panel px-5 py-3 text-cyan-200 font-system tracking-wide z-50">
          {toast}
        </div>
      )}

      <div className="hud-panel p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-system text-2xl text-cyan-200 hud-glow-text">{player.name}</h1>
            <p className="text-xs text-slate-400">
              {player.title} · Class: {player.class}
            </p>
          </div>
          <div className="text-right">
            <p className="font-system text-3xl text-fuchsia-300">RANK {rank}</p>
            <p className="text-xs text-slate-400">{player.gold} Gold</p>
          </div>
        </div>
        <XpBar level={player.level} xp={player.xp} />
      </div>

      {!player.mainQuestComplete && (
        <div className="hud-panel p-6">
          <p className="text-xs text-fuchsia-400 tracking-widest mb-1">MAIN QUEST</p>
          <div className="flex items-center justify-between">
            <h2 className="font-system text-lg text-slate-100">Discover Your Path</h2>
            <button
              onClick={completeMainQuest}
              className="px-4 py-2 border border-fuchsia-500/60 text-fuchsia-300 hover:bg-fuchsia-500/10 transition text-sm"
            >
              MARK COMPLETE
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="hud-panel p-6 space-y-4">
          <p className="text-xs text-cyan-400 tracking-widest">STATS</p>
          {STAT_KEYS.map((key) => (
            <StatBar key={key} statKey={key} value={player.stats[key]} />
          ))}
        </div>

        <div className="hud-panel p-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-cyan-400 tracking-widest">DAILY QUESTS</p>
            <p className="text-xs text-slate-500">{player.questsCompletedTotal} completed all-time</p>
          </div>
          <QuestList quests={dailyQuests} onCompleteQuest={completeQuest} />
          {allDailiesDone && (
            <p className="text-center text-sm text-cyan-300 pt-2">Daily Mission Complete. Return tomorrow.</p>
          )}
        </div>
      </div>
    </div>
  )
}
