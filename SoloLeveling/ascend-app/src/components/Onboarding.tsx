import { useState } from 'react'
import type { FocusArea, GameState } from '../types'
import { createPlayer } from '../lib/player'
import { generateStarterQuests } from '../lib/quests'

const ALL_FOCUS_AREAS: FocusArea[] = [
  'Health',
  'Knowledge',
  'Career',
  'Money',
  'Confidence',
  'Creativity',
  'Relationships',
]

type Step = 'welcome' | 'name' | 'focus' | 'assessment' | 'reveal'

export default function Onboarding({ onComplete }: { onComplete: (game: GameState) => void }) {
  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([])
  const [assessments, setAssessments] = useState<Partial<Record<FocusArea, number>>>({})

  function toggleFocus(area: FocusArea) {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    )
  }

  function finish() {
    const player = createPlayer(name, focusAreas, assessments)
    const dailyQuests = generateStarterQuests(focusAreas)
    onComplete({ player, dailyQuests })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="hud-panel hud-panel-active w-full max-w-xl p-8">
        {step === 'welcome' && (
          <div className="text-center space-y-6">
            <p className="text-cyan-400 tracking-[0.3em] text-sm">SYSTEM INITIALIZATION</p>
            <h1 className="font-system text-4xl font-bold hud-glow-text text-cyan-300">
              WELCOME, PLAYER
            </h1>
            <p className="text-slate-400">Initializing your profile...</p>
            <button
              className="mt-4 px-6 py-3 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/10 transition font-system tracking-wider"
              onClick={() => setStep('name')}
            >
              BEGIN
            </button>
          </div>
        )}

        {step === 'name' && (
          <div className="space-y-6">
            <h2 className="font-system text-xl text-cyan-300">CHARACTER CREATION</h2>
            <p className="text-slate-400 text-sm">What should the System call you?</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-black/40 border border-cyan-500/40 px-4 py-3 text-cyan-100 focus:outline-none focus:border-cyan-400"
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep('focus')}
            />
            <button
              disabled={!name.trim()}
              className="px-6 py-3 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/10 transition font-system tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => setStep('focus')}
            >
              CONTINUE
            </button>
          </div>
        )}

        {step === 'focus' && (
          <div className="space-y-6">
            <h2 className="font-system text-xl text-cyan-300">WHAT DO YOU WANT TO IMPROVE?</h2>
            <p className="text-slate-400 text-sm">Select every path that calls to you.</p>
            <div className="grid grid-cols-2 gap-3">
              {ALL_FOCUS_AREAS.map((area) => {
                const active = focusAreas.includes(area)
                return (
                  <button
                    key={area}
                    onClick={() => toggleFocus(area)}
                    className={`px-4 py-3 border text-left transition ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {active ? '☑' : '☐'} {area}
                  </button>
                )
              })}
            </div>
            <button
              disabled={focusAreas.length === 0}
              className="px-6 py-3 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/10 transition font-system tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => setStep('assessment')}
            >
              CONTINUE
            </button>
          </div>
        )}

        {step === 'assessment' && (
          <div className="space-y-6">
            <h2 className="font-system text-xl text-cyan-300">CURRENT ASSESSMENT</h2>
            <p className="text-slate-400 text-sm">Rate your current standing (1 = Beginner, 10 = Expert).</p>
            <div className="space-y-5">
              {focusAreas.map((area) => (
                <div key={area}>
                  <div className="flex justify-between text-sm text-slate-300 mb-1">
                    <span>{area}</span>
                    <span className="text-cyan-300">{assessments[area] ?? 3}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={assessments[area] ?? 3}
                    onChange={(e) =>
                      setAssessments((prev) => ({ ...prev, [area]: Number(e.target.value) }))
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
              ))}
            </div>
            <button
              className="px-6 py-3 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/10 transition font-system tracking-wider"
              onClick={() => setStep('reveal')}
            >
              GENERATE BUILD
            </button>
          </div>
        )}

        {step === 'reveal' && (
          <div className="space-y-6 text-center">
            <h2 className="font-system text-xl text-cyan-300">BUILD GENERATED</h2>
            <div className="text-left bg-black/30 border border-cyan-500/20 p-4 space-y-1 text-sm">
              <p><span className="text-slate-500">PLAYER:</span> <span className="text-cyan-200">{name || 'Player'}</span></p>
              <p><span className="text-slate-500">LEVEL:</span> 1</p>
              <p><span className="text-slate-500">CLASS:</span> Unknown</p>
              <p><span className="text-slate-500">TITLE:</span> The Awakened</p>
              <p className="text-slate-500 pt-2">MAIN QUEST:</p>
              <p className="text-cyan-200">Discover Your Path</p>
            </div>
            <button
              className="px-6 py-3 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/10 transition font-system tracking-wider"
              onClick={finish}
            >
              ENTER THE SYSTEM
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
