import { createContext, useContext, useState, useEffect } from 'react'
import { recalculateAllPoints } from '../utils/points'

const AppContext = createContext(null)

const SEED_TEAMS = [
  { id: 1, naam: 'Team Geel',  kleur: '#EAB308', leden: { leiding: ['Aron'],  aspis: ['Bram', 'Jonas'] }, total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, quiz_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 },
  { id: 2, naam: 'Team Rood',  kleur: '#EF4444', leden: { leiding: ['Lena'],  aspis: ['Finn', 'Sara'] },  total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, quiz_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 },
  { id: 3, naam: 'Team Blauw', kleur: '#3B82F6', leden: { leiding: ['Wout'],  aspis: ['Marie', 'Kobe'] }, total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, quiz_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 },
  { id: 4, naam: 'Team Groen', kleur: '#22C55E', leden: { leiding: ['Julie'], aspis: ['Tom', 'Noor'] },   total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, quiz_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 },
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
  quiz_points_per_question: 10,
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

function makeEmptyQuestion(id) {
  return { id, tekst: '', opties: [], antwoorden: {} }
}

function makeEmptyStageQuestions(stageNum) {
  return [1, 2, 3, 4].map(n => makeEmptyQuestion(stageNum * 10 + n))
}

const SEED_QUIZ = {
  1: makeEmptyStageQuestions(1),
  2: makeEmptyStageQuestions(2),
  3: makeEmptyStageQuestions(3),
}

function normalizeQuizStage(stageQuestions, stageNum) {
  const base = Array.isArray(stageQuestions) ? stageQuestions.slice(0, 4) : []
  while (base.length < 4) base.push(makeEmptyQuestion(stageNum * 10 + base.length + 1))
  return base.map((q, i) => ({
    id: q?.id ?? stageNum * 10 + i + 1,
    tekst: q?.tekst ?? '',
    opties: Array.isArray(q?.opties) ? q.opties : [],
    antwoorden: q?.antwoorden && typeof q.antwoorden === 'object' ? q.antwoorden : {},
  }))
}

function loadQuiz(fallback) {
  try {
    const stored = localStorage.getItem('tdf_quiz')
    if (!stored) return fallback
    const parsed = JSON.parse(stored)
    return {
      1: normalizeQuizStage(parsed?.[1], 1),
      2: normalizeQuizStage(parsed?.[2], 2),
      3: normalizeQuizStage(parsed?.[3], 3),
    }
  } catch {
    return fallback
  }
}

export function AppProvider({ children }) {
  const [teams, setTeams] = useState(() => loadTeams(SEED_TEAMS))
  const [challenges, setChallenges] = useState(() => load('tdf_challenges', []))
  const [bonusPenalties, setBonusPenalties] = useState(() => load('tdf_bonuspenalties', []))
  const [config, setConfig] = useState(() => load('tdf_config', SEED_CONFIG))
  const [quiz, setQuiz] = useState(() => loadQuiz(SEED_QUIZ))

  useEffect(() => { localStorage.setItem('tdf_teams', JSON.stringify(teams)) }, [teams])
  useEffect(() => { localStorage.setItem('tdf_challenges', JSON.stringify(challenges)) }, [challenges])
  useEffect(() => { localStorage.setItem('tdf_bonuspenalties', JSON.stringify(bonusPenalties)) }, [bonusPenalties])
  useEffect(() => { localStorage.setItem('tdf_config', JSON.stringify(config)) }, [config])
  useEffect(() => { localStorage.setItem('tdf_quiz', JSON.stringify(quiz)) }, [quiz])

  const addTeam = (team) => {
    const newTeam = { ...team, id: Date.now(), total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, quiz_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 }
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
    setTeams(recalculateAllPoints(teams, updatedChallenges, bonusPenalties, quiz, config.quiz_points_per_question))
  }

  const addBonusPenalty = (entry) => {
    const newEntry = { ...entry, id: Date.now(), date: new Date().toISOString() }
    const updated = [...bonusPenalties, newEntry]
    setBonusPenalties(updated)
    setTeams(recalculateAllPoints(teams, challenges, updated, quiz, config.quiz_points_per_question))
  }

  const updateConfig = (updates) => setConfig(prev => ({ ...prev, ...updates }))

  const recalculateAll = () => setTeams(recalculateAllPoints(teams, challenges, bonusPenalties, quiz, config.quiz_points_per_question))

  const updateQuizQuestion = (stage, index, updates) => {
    setQuiz(prev => ({
      ...prev,
      [stage]: prev[stage].map((q, i) => i === index ? { ...q, ...updates } : q),
    }))
  }

  const setQuizAnswer = (stage, index, teamId, correct) => {
    const updatedQuiz = {
      ...quiz,
      [stage]: quiz[stage].map((q, i) => i === index
        ? { ...q, antwoorden: { ...q.antwoorden, [String(teamId)]: correct } }
        : q),
    }
    setQuiz(updatedQuiz)
    setTeams(recalculateAllPoints(teams, challenges, bonusPenalties, updatedQuiz, config.quiz_points_per_question))
  }

  const resetScores = () => {
    const reset = teams.map(t => ({ ...t, total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, quiz_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 }))
    setTeams(reset)
    setChallenges(prev => prev.map(c => ({ ...c, results: [], completed: false })))
    setBonusPenalties([])
    setQuiz(prev => ({
      1: prev[1].map(q => ({ ...q, antwoorden: {} })),
      2: prev[2].map(q => ({ ...q, antwoorden: {} })),
      3: prev[3].map(q => ({ ...q, antwoorden: {} })),
    }))
  }

  return (
    <AppContext.Provider value={{ teams, challenges, bonusPenalties, config, quiz, addTeam, updateTeam, deleteTeam, addChallenge, updateChallenge, deleteChallenge, setResults, addBonusPenalty, updateConfig, recalculateAll, resetScores, updateQuizQuestion, setQuizAnswer }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
