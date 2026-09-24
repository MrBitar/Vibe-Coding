import type { Quest } from '../types'

export default function QuestList({
  quests,
  onCompleteQuest,
}: {
  quests: Quest[]
  onCompleteQuest: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      {quests.map((quest) => (
        <button
          key={quest.id}
          disabled={quest.completed}
          onClick={() => onCompleteQuest(quest.id)}
          className={`w-full flex items-center justify-between px-4 py-3 border text-left transition ${
            quest.completed
              ? 'border-slate-800 text-slate-600 line-through'
              : 'border-cyan-800/60 text-slate-200 hover:border-cyan-400 hover:bg-cyan-500/5'
          }`}
        >
          <span>
            {quest.completed ? '✔' : '☐'} {quest.title}
          </span>
          <span className="text-xs text-cyan-400">+{quest.xp} XP</span>
        </button>
      ))}
    </div>
  )
}
