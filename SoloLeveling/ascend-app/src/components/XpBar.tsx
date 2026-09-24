import { xpToNextLevel } from '../lib/xp'

export default function XpBar({ level, xp }: { level: number; xp: number }) {
  const needed = xpToNextLevel(level)
  const pct = Math.min(100, (xp / needed) * 100)

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span className="font-system">LEVEL {level}</span>
        <span>
          {xp} / {needed} XP
        </span>
      </div>
      <div className="h-3 bg-black/40 border border-purple-900/60">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
