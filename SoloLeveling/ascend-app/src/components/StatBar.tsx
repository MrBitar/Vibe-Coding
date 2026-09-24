const STAT_LABELS: Record<string, string> = {
  discipline: 'Discipline',
  knowledge: 'Knowledge',
  health: 'Health',
  creativity: 'Creativity',
  social: 'Social',
  wealth: 'Wealth',
  focus: 'Focus',
}

const MAX_STAT_SCALE = 20

export default function StatBar({ statKey, value }: { statKey: string; value: number }) {
  const pct = Math.min(100, (value / MAX_STAT_SCALE) * 100)
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{STAT_LABELS[statKey] ?? statKey}</span>
        <span className="text-cyan-300">{value}</span>
      </div>
      <div className="h-2 bg-black/40 border border-cyan-900/60">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
