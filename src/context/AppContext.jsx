import { createContext, useContext, useState, useEffect } from 'react'
import { recalculateAllPoints } from '../utils/points'

const AppContext = createContext(null)

const SEED_TEAMS = [
  { id: 1, naam: 'Team Geel',  kleur: '#EAB308', leden: { leiding: ['Aron'],  aspis: ['Bram', 'Jonas'] }, total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 },
  { id: 2, naam: 'Team Rood',  kleur: '#EF4444', leden: { leiding: ['Lena'],  aspis: ['Finn', 'Sara'] },  total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 },
  { id: 3, naam: 'Team Blauw', kleur: '#3B82F6', leden: { leiding: ['Wout'],  aspis: ['Marie', 'Kobe'] }, total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 },
  { id: 4, naam: 'Team Groen', kleur: '#22C55E', leden: { leiding: ['Julie'], aspis: ['Tom', 'Noor'] },   total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 },
]

/* Migrate old flat-array leden to { leiding, aspis } */
function migrateLeden(leden) {
  if (!leden) return { leiding: [], aspis: [] }
  if (Array.isArray(leden)) return { leiding: [], aspis: leden }
  return leden
}

const SEED_CONFIG = {
  event_naam: 'Tour de France – Chiro Edition 2026',
  status: 'upcoming',
  start_date: '2026-07-01T10:00:00',
  admin_password: 'chiro2026',
  winner_team_id: null,
}

function load(key, fallback) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function loadTeams(fallback) {
  try {
    const stored = localStorage.getItem('tdf_teams')
    if (!stored) return fallback
    const teams = JSON.parse(stored)
    return teams.map(t => ({ ...t, leden: migrateLeden(t.leden) }))
  } catch {
    return fallback
  }
}

export function AppProvider({ children }) {
  const [teams, setTeams] = useState(() => loadTeams(SEED_TEAMS))
  const [challenges, setChallenges] = useState(() => load('tdf_challenges', []))
  const [bonusPenalties, setBonusPenalties] = useState(() => load('tdf_bonuspenalties', []))
  const [config, setConfig] = useState(() => load('tdf_config', SEED_CONFIG))

  useEffect(() => { localStorage.setItem('tdf_teams', JSON.stringify(teams)) }, [teams])
  useEffect(() => { localStorage.setItem('tdf_challenges', JSON.stringify(challenges)) }, [challenges])
  useEffect(() => { localStorage.setItem('tdf_bonuspenalties', JSON.stringify(bonusPenalties)) }, [bonusPenalties])
  useEffect(() => { localStorage.setItem('tdf_config', JSON.stringify(config)) }, [config])

  const addTeam = (team) => {
    const newTeam = { ...team, id: Date.now(), total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 }
    setTeams(prev => [...prev, newTeam])
  }

  const updateTeam = (id, updates) => setTeams(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  const deleteTeam = (id) => setTeams(prev => prev.filter(t => t.id !== id))

  const addChallenge = (challenge) => {
    const newChallenge = { ...challenge, id: Date.now(), results: [], notes: challenge.notes || '', photos: [], completed: false }
    setChallenges(prev => [...prev, newChallenge])
  }

  const updateChallenge = (id, updates) => setChallenges(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  const deleteChallenge = (id) => setChallenges(prev => prev.filter(c => c.id !== id))

  const setResults = (challengeId, orderedTeamIds, playerSelections = {}) => {
    const challenge = challenges.find(c => c.id === challengeId)
    if (!challenge) return
    const results = orderedTeamIds.map((teamId, index) => ({
      team_id: teamId,
      positie: index + 1,
      punten: challenge.power_stage
        ? Math.max(0, (teams.length - 1 - index) * 2)
        : Math.max(0, teams.length - 1 - index),
      spelers: playerSelections[teamId] ?? [],
    }))
    const updatedChallenges = challenges.map(c => c.id === challengeId ? { ...c, results, completed: true } : c)
    setChallenges(updatedChallenges)
    setTeams(recalculateAllPoints(teams, updatedChallenges, bonusPenalties))
  }

  const addBonusPenalty = (entry) => {
    const newEntry = { ...entry, id: Date.now(), date: new Date().toISOString() }
    const updated = [...bonusPenalties, newEntry]
    setBonusPenalties(updated)
    setTeams(recalculateAllPoints(teams, challenges, updated))
  }

  const updateConfig = (updates) => setConfig(prev => ({ ...prev, ...updates }))

  const recalculateAll = () => setTeams(recalculateAllPoints(teams, challenges, bonusPenalties))

  const resetScores = () => {
    const reset = teams.map(t => ({ ...t, total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 }))
    setTeams(reset)
    setChallenges(prev => prev.map(c => ({ ...c, results: [], completed: false })))
    setBonusPenalties([])
  }

  return (
    <AppContext.Provider value={{ teams, challenges, bonusPenalties, config, addTeam, updateTeam, deleteTeam, addChallenge, updateChallenge, deleteChallenge, setResults, addBonusPenalty, updateConfig, recalculateAll, resetScores }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
