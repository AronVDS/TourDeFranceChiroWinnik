import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ErrorBoundary from '../components/ErrorBoundary'
import confetti from 'canvas-confetti'
import { berekenAllSpelerStats } from '../utils/mvp'

/* ── Helpers ─────────────────────────────────────────────────── */
function migrateLeden(leden) {
  if (!leden) return { leiding: [], aspis: [], geslacht: {} }
  if (Array.isArray(leden)) return { leiding: [], aspis: leden, geslacht: {} }
  return { leiding: leden.leiding ?? [], aspis: leden.aspis ?? [], geslacht: leden.geslacht ?? {} }
}

function parseTeams(raw) {
  try {
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return null
    return list.map(t => ({ ...t, leden: migrateLeden(t.leden) }))
  } catch { return null }
}

function parseChallenges(raw) {
  try {
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : null
  } catch { return null }
}

function parseQuiz(raw) {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch { return null }
}

function parseActiveQuiz(raw) {
  try {
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/* ── Timer overlay ───────────────────────────────────────────── */
function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1)
  } catch {}
}

function TimerOverlay() {
  const [timerState, setTimerState] = useState(null)
  const [timeLeft, setTimeLeft]     = useState(0)
  const [done, setDone]             = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    const tick = setInterval(() => {
      try {
        const raw = localStorage.getItem('tdf_timer')
        if (!raw) { setTimerState(null); return }
        const s = JSON.parse(raw)
        if (!s.timer_active) { setTimerState(null); return }
        setTimerState(s)
        const left = Math.max(0, Math.ceil((s.timer_end - Date.now()) / 1000))
        setTimeLeft(left)
        if (left <= 0 && !doneRef.current) {
          doneRef.current = true
          setDone(true)
          playBeep()
          setTimeout(() => {
            try {
              const raw2 = localStorage.getItem('tdf_timer')
              if (raw2) {
                const s2 = JSON.parse(raw2)
                localStorage.setItem('tdf_timer', JSON.stringify({ ...s2, timer_active: false }))
              }
            } catch {}
            setTimerState(null)
            setDone(false)
            doneRef.current = false
          }, 3000)
        }
      } catch { setTimerState(null) }
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  if (!timerState && !done) return null

  const mm = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const ss = (timeLeft % 60).toString().padStart(2, '0')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16,
    }}>
      {!done && timerState?.timer_label && (
        <div className="font-barlow-condensed font-bold uppercase tracking-[0.3em] text-white"
          style={{ fontSize: 48 }}>
          {timerState.timer_label}
        </div>
      )}
      <div className="font-bebas text-yellow leading-none" style={{ fontSize: done ? 110 : 200 }}>
        {done ? 'TIJD IS OM!' : `${mm}:${ss}`}
      </div>
    </div>
  )
}

/* ── Quiz overlay ────────────────────────────────────────────── */
function readQuizState() {
  const activeState = parseActiveQuiz(localStorage.getItem('tdf_quiz_active'))
  if (!activeState) return { active: null, question: null }
  const quiz = parseQuiz(localStorage.getItem('tdf_quiz'))
  const q = quiz?.[activeState.stage]?.[activeState.questionIndex] ?? null
  return { active: activeState, question: q }
}

function QuizOverlay() {
  const [state, setState] = useState(() => readQuizState())

  useEffect(() => {
    const tick = setInterval(() => setState(readQuizState()), 1000)
    return () => clearInterval(tick)
  }, [])

  const { active, question } = state
  if (!active || !question) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#12131A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 32, padding: '5vh 8vw',
    }}>
      <div className="font-barlow-condensed font-bold uppercase tracking-[0.3em] text-yellow" style={{ fontSize: 22 }}>
        Stage {active.stage} · Vraag {active.questionIndex + 1}
      </div>
      <div className="font-bebas text-white text-center leading-tight" style={{ fontSize: 'clamp(40px, 6vw, 96px)' }}>
        {question.tekst}
      </div>
      {question.opties?.length > 0 && (
        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl mt-6">
          {question.opties.map((optie, i) => (
            <div key={i} className="flex items-center gap-4 bg-card border border-line rounded-2xl px-6 py-5">
              <div className="font-bebas text-yellow shrink-0" style={{ fontSize: 44 }}>
                {String.fromCharCode(65 + i)}
              </div>
              <div className="font-barlow-condensed font-semibold text-white" style={{ fontSize: 26 }}>
                {optie}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Team row ────────────────────────────────────────────────── */
function TeamRow({ team, index, leaderPts, isLast }) {
  const isFirst = index === 0
  const gap     = isFirst ? 0 : leaderPts - team.total_points

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="flex-1 flex items-center relative overflow-hidden"
      style={{
        background: isFirst ? 'rgba(255,214,0,0.035)' : 'transparent',
        borderBottom: !isLast ? '1px solid rgba(255,255,255,0.04)' : 'none',
        minHeight: 0,
      }}
    >
      {/* Left color bar */}
      <div style={{ width: 10, alignSelf: 'stretch', background: team.kleur, flexShrink: 0 }} />

      {/* Position number */}
      <div
        className="font-bebas leading-none text-center shrink-0"
        style={{
          width: 110,
          fontSize: isFirst ? 96 : 80,
          color: isFirst ? 'rgba(255,214,0,0.22)' : 'rgba(255,255,255,0.08)',
          paddingLeft: 14,
        }}
      >
        {index + 1}
      </div>

      {/* Name + sub-label */}
      <div className="flex-1 min-w-0 px-6">
        <div
          className="font-bebas text-white leading-none truncate"
          style={{ fontSize: isFirst ? 52 : 44 }}
        >
          {team.naam}
        </div>
        {isFirst ? (
          <div
            className="font-barlow-condensed font-bold uppercase tracking-[0.25em] text-yellow mt-1 leading-none"
            style={{ fontSize: 11 }}
          >
            🟡 Leider
          </div>
        ) : gap > 0 ? (
          <div
            className="font-barlow-condensed text-muted mt-1 leading-none"
            style={{ fontSize: 13 }}
          >
            -{gap} pts
          </div>
        ) : null}
      </div>

      {/* Points */}
      <div className="text-right pr-8 shrink-0">
        <div
          className="font-bebas text-yellow leading-none"
          style={{ fontSize: isFirst ? 80 : 64 }}
        >
          {team.total_points}
        </div>
      </div>
    </motion.div>
  )
}

/* ── MVP row ─────────────────────────────────────────────────── */
function MVPRow({ player, index, isLast }) {
  const isFirst = index === 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="flex-1 flex items-center relative overflow-hidden"
      style={{
        background: isFirst ? 'rgba(255,214,0,0.035)' : 'transparent',
        borderBottom: !isLast ? '1px solid rgba(255,255,255,0.04)' : 'none',
        padding: '0 28px 0 20px',
        minHeight: 0,
      }}
    >
      {/* Position */}
      <div
        className="font-bebas leading-none text-center shrink-0"
        style={{
          width: isFirst ? 52 : 40,
          fontSize: isFirst ? 52 : 40,
          color: isFirst ? '#FFD600' : 'rgba(255,255,255,0.11)',
        }}
      >
        {isFirst ? '👑' : index + 1}
      </div>

      {/* Name + team + role */}
      <div className="flex-1 min-w-0 ml-5">
        <div
          className="font-bebas text-white leading-none truncate"
          style={{ fontSize: isFirst ? 36 : 28 }}
        >
          {player.naam}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: player.team_kleur }} />
          <span className="font-barlow-condensed text-muted leading-none" style={{ fontSize: 12 }}>
            {player.team_naam}
          </span>
          <span
            className="font-barlow-condensed font-bold uppercase tracking-wider px-1.5 py-0.5 rounded leading-none"
            style={{
              fontSize: 9,
              color:      player.rol === 'leiding' ? '#FFD600' : '#60A5FA',
              background: player.rol === 'leiding' ? 'rgba(255,214,0,0.1)' : 'rgba(96,165,250,0.1)',
              border:     `1px solid ${player.rol === 'leiding' ? 'rgba(255,214,0,0.3)' : 'rgba(96,165,250,0.3)'}`,
            }}
          >
            {player.rol === 'leiding' ? 'Leiding' : 'Aspi'}
          </span>
        </div>
      </div>

      {/* Points */}
      <div className="text-right shrink-0">
        <div
          className="font-bebas text-yellow leading-none"
          style={{ fontSize: isFirst ? 52 : 40 }}
        >
          {player.punten_bijgedragen}
        </div>
        <div className="font-barlow-condensed text-muted leading-none" style={{ fontSize: 10 }}>
          pts
        </div>
      </div>
    </motion.div>
  )
}

/* ── Stats bar ───────────────────────────────────────────────── */
function StatsBar({ sorted }) {
  const leader = sorted[0]
  const gap    = sorted.length > 1
    ? (sorted[0]?.total_points ?? 0) - (sorted[1]?.total_points ?? 0)
    : null

  const Divider = () => (
    <div style={{ width: 1, background: 'rgba(255,214,0,0.12)', alignSelf: 'stretch' }} />
  )

  return (
    <div
      className="flex h-full items-stretch"
      style={{ borderTop: '1px solid rgba(255,214,0,0.18)' }}
    >
      <div className="flex-1 flex flex-col justify-center items-center">
        <div
          className="font-barlow-condensed font-bold uppercase tracking-[0.3em] text-muted"
          style={{ fontSize: 11 }}
        >
          Leider
        </div>
        <div
          className="font-bebas text-yellow leading-none truncate max-w-full px-4 text-center"
          style={{ fontSize: 46 }}
        >
          {leader?.naam ?? '—'}
        </div>
      </div>

      <Divider />

      <div className="flex-1 flex flex-col justify-center items-center">
        <div
          className="font-barlow-condensed font-bold uppercase tracking-[0.3em] text-muted"
          style={{ fontSize: 11 }}
        >
          Top Score
        </div>
        <div className="font-bebas text-yellow leading-none" style={{ fontSize: 58 }}>
          {leader?.total_points ?? 0}
        </div>
      </div>

      <Divider />

      <div className="flex-1 flex flex-col justify-center items-center">
        <div
          className="font-barlow-condensed font-bold uppercase tracking-[0.3em] text-muted"
          style={{ fontSize: 11 }}
        >
          Gap #1 → #2
        </div>
        <div className="font-bebas text-yellow leading-none" style={{ fontSize: 58 }}>
          {gap !== null ? `${gap} pt` : '—'}
        </div>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────── */
function LivePage() {
  const { teams: ctxTeams, challenges: ctxChallenges, config } = useApp()
  const [teams, setTeams]           = useState(() => ctxTeams ?? [])
  const [challenges, setChallenges] = useState(() => ctxChallenges ?? [])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const prevLeader = useRef(null)
  const containerRef = useRef(null)
  const [quizActive, setQuizActive] = useState(false)

  /* Poll whether a quiz question is currently shown, every 1s */
  useEffect(() => {
    const poll = setInterval(() => {
      setQuizActive(!!localStorage.getItem('tdf_quiz_active'))
    }, 1000)
    return () => clearInterval(poll)
  }, [])

  /* Poll localStorage every 3s */
  useEffect(() => {
    const poll = setInterval(() => {
      const rawT = localStorage.getItem('tdf_teams')
      if (rawT) { const p = parseTeams(rawT); if (p) setTeams(p) }
      const rawC = localStorage.getItem('tdf_challenges')
      if (rawC) { const p = parseChallenges(rawC); if (p) setChallenges(p) }
    }, 3000)
    return () => clearInterval(poll)
  }, [])

  const sorted   = [...(teams ?? [])].sort((a, b) => b.total_points - a.total_points)
  const mvpStats = berekenAllSpelerStats(teams, challenges).slice(0, 5)
  const leaderId = sorted[0]?.id
  const leaderPts = sorted[0]?.total_points ?? 0

  /* Confetti on leader change */
  useEffect(() => {
    if (prevLeader.current !== null && prevLeader.current !== leaderId && leaderId !== undefined) {
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#FFD600', '#F5A623', '#ffffff'] })
    }
    prevLeader.current = leaderId
  }, [leaderId])

  /* Fullscreen */
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const eventNaam = config?.event_naam ?? 'Tour de Chiro'

  return (
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateRows: '10vh 1fr 15vh',
        background: `
          radial-gradient(circle, rgba(42,45,62,0.45) 1px, transparent 1px) 0 0 / 20px 20px,
          linear-gradient(135deg, #080B14 0%, #0D1117 100%)
        `,
        boxSizing: 'border-box',
      }}
    >
      {quizActive ? <QuizOverlay /> : <TimerOverlay />}
      {/* ── Header ──────────────────────────────────────── */}
        <div
          className="flex items-center px-6 gap-6"
          style={{ borderBottom: '1px solid rgba(255,214,0,0.18)' }}
        >
          {/* Left: LIVE badge + brand */}
          <div className="flex items-center gap-4 shrink-0">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-barlow-condensed font-bold text-red-400 text-sm uppercase tracking-widest">
                Live
              </span>
            </div>
            <span className="font-bebas text-yellow leading-none tracking-widest" style={{ fontSize: 32 }}>
              Tour de Chiro
            </span>
          </div>

          {/* Center: event naam */}
          <div className="flex-1 flex justify-center min-w-0">
            <span
              className="font-barlow-condensed font-bold uppercase tracking-[0.2em] text-muted truncate"
              style={{ fontSize: 14 }}
            >
              {eventNaam}
            </span>
          </div>

          {/* Right: refresh + fullscreen */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted spin-slow" />
              <span className="font-barlow-condensed text-muted" style={{ fontSize: 13 }}>
                Auto-refresh 3s
              </span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-muted hover:text-white rounded-xl border border-line hover:bg-white/5 transition-colors"
              title={isFullscreen ? 'Verlaat volledig scherm' : 'Volledig scherm'}
            >
              {isFullscreen
                ? <Minimize2 className="w-[18px] h-[18px]" />
                : <Maximize2 className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        {/* ── Main: Team stand (50%) + MVP (50%) ──────────── */}
        <div className="flex" style={{ minHeight: 0 }}>

          {/* Left: Team standings */}
          <div className="flex flex-col" style={{ width: '50%' }}>
            <div
              className="font-barlow-condensed font-bold uppercase tracking-[0.3em] text-muted shrink-0 px-6"
              style={{ paddingTop: 14, paddingBottom: 8, fontSize: 11 }}
            >
              Klassement
            </div>
            <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
              <AnimatePresence>
                {sorted.map((team, i) => (
                  <TeamRow
                    key={team.id}
                    team={team}
                    index={i}
                    leaderPts={leaderPts}
                    isLast={i === sorted.length - 1}
                  />
                ))}
              </AnimatePresence>
              {sorted.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-muted font-barlow text-sm">
                  Geen teams
                </div>
              )}
            </div>
          </div>

          {/* Vertical separator */}
          <div style={{ width: 1, background: 'rgba(255,214,0,0.15)', alignSelf: 'stretch', flexShrink: 0 }} />

          {/* Right: MVP ranking */}
          <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
            <div
              className="font-barlow-condensed font-bold uppercase tracking-[0.3em] text-muted shrink-0 px-6"
              style={{ paddingTop: 14, paddingBottom: 8, fontSize: 11 }}
            >
              👑 MVP Ranking
            </div>
            <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
              <AnimatePresence>
                {mvpStats.map((player, i) => (
                  <MVPRow
                    key={`${player.naam}-${player.team_id}`}
                    player={player}
                    index={i}
                    isLast={i === mvpStats.length - 1}
                  />
                ))}
              </AnimatePresence>
              {mvpStats.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-muted font-barlow text-sm">
                  Voeg spelers toe om de MVP te zien
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats bar ────────────────────────────────────── */}
        <StatsBar sorted={sorted} />
    </div>
  )
}

export default function Live() {
  return (
    <ErrorBoundary>
      <LivePage />
    </ErrorBoundary>
  )
}
