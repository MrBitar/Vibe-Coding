import { useEffect, useState } from 'react'
import type { GameState } from './types'
import { loadGame, saveGame, todayKey } from './lib/storage'
import { generateFreshDailyQuests } from './lib/quests'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'

function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = loadGame()
    if (saved) {
      if (saved.player.lastActiveDate !== todayKey()) {
        saved.dailyQuests = generateFreshDailyQuests(saved.dailyQuests)
        saved.player.lastActiveDate = todayKey()
      }
      setGame(saved)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (game) saveGame(game)
  }, [game])

  if (!loaded) return null

  if (!game) {
    return <Onboarding onComplete={setGame} />
  }

  return <Dashboard game={game} onChange={setGame} />
}

export default App
