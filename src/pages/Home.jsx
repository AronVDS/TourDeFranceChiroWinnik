import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { Users, BarChart2, Radio, Disc, Trophy, Settings } from 'lucide-react'

function useCountdown(target) {
  const calc = () => {
    const diff = new Date(target) - new Date()
    if (diff <= 0) return null
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }
  const [time, setTime] = useState(calc())
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(id)
  }, [target])
  return time
}

function CountdownPill({ value, label, large }) {
  return (
    <div className={`bg-page border border-white/10 rounded-xl text-center ${large ? 'px-6 py-5 min-w-[90px]' : 'px-4 py-3 min-w-[66px]'}`}>
      <div className={`font-bebas text-yellow leading-none tabular-nums ${large ? 'text-6xl' : 'text-4xl'}`}>
        {String(value).padStart(2, '0')}
      </div>
      <div className="font-barlow-condensed font-semibold text-[9px] uppercase tracking-widest text-muted mt-1">
        {label}
      </div>
    </div>
  )
}

function CountdownPills({ time, large = false }) {
  if (!time) return (
    <div className="font-bebas text-3xl text-page bg-page/20 px-5 py-3 rounded-xl tracking-widest inline-block">
      HET IS BEGONNEN!
    </div>
  )
  return (
    <div className="flex gap-2">
      {[['d', 'Dagen'], ['h', 'Uur'], ['m', 'Min'], ['s', 'Sec']].map(([k, label]) => (
        <CountdownPill key={k} value={time[k]} label={label} large={large} />
      ))}
    </div>
  )
}

const navButtons = [
  { to: '/teams',     label: 'Teams',     icon: Users },
  { to: '/rankings',  label: 'Klassement', icon: BarChart2 },
  { to: '/live',      label: 'Live',      icon: Radio },
  { to: '/strafwiel', label: 'Strafwiel', icon: Disc },
  { to: '/stage/1',   label: 'Stage 1',   icon: Trophy },
  { to: '/stage/2',   label: 'Stage 2',   icon: Trophy },
  { to: '/stage/3',   label: 'Stage 3',   icon: Trophy },
  { to: '/admin',     label: 'Admin',     icon: Settings },
]

const statusCfg = {
  upcoming: { cls: 'bg-card-2 text-muted border-line',                 label: 'BINNENKORT' },
  active:   { cls: 'bg-green-500/15 text-green-400 border-green-500/30', label: 'ACTIEF' },
  locked:   { cls: 'bg-card-2 text-muted border-line',                 label: 'AFGESLOTEN' },
}

/* ── Bike silhouette SVG (decorative) ────────────────────── */
function BikeSilhouette() {
  return (
    <svg
      viewBox="0 0 520 320"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute bottom-0 right-0 w-[70%] opacity-[0.07] select-none pointer-events-none"
      fill="#000"
    >
      {/* Rear wheel */}
      <circle cx="130" cy="220" r="90" fill="none" stroke="#000" strokeWidth="18"/>
      <circle cx="130" cy="220" r="10"/>
      {/* Front wheel */}
      <circle cx="390" cy="220" r="90" fill="none" stroke="#000" strokeWidth="18"/>
      <circle cx="390" cy="220" r="10"/>
      {/* Frame */}
      <polygon points="130,220 220,80 310,220" strokeWidth="2"/>
      <polygon points="220,80 390,220 330,80 220,80" strokeWidth="2"/>
      {/* Seat tube */}
      <rect x="208" y="70" width="16" height="80" rx="6"/>
      {/* Handlebar */}
      <rect x="360" y="60" width="14" height="70" rx="6"/>
      <rect x="350" y="58" width="60" height="14" rx="6"/>
      {/* Saddle */}
      <rect x="185" y="56" width="70" height="16" rx="8"/>
      {/* Rider body */}
      <ellipse cx="280" cy="100" rx="60" ry="30" transform="rotate(-20 280 100)"/>
      {/* Rider head */}
      <circle cx="350" cy="50" r="28"/>
      {/* Rider legs */}
      <line x1="220" y1="130" x2="170" y2="210" stroke="#000" strokeWidth="14" strokeLinecap="round"/>
      <line x1="220" y1="130" x2="260" y2="200" stroke="#000" strokeWidth="14" strokeLinecap="round"/>
    </svg>
  )
}

/* ── Hero (yellow section content) ───────────────────────── */
function HeroContent({ time, config, large = false }) {
  const sc = statusCfg[config.status] || statusCfg.upcoming
  return (
    <div className="flex flex-col justify-center h-full py-12 px-6 lg:px-12 relative overflow-hidden">
      <BikeSilhouette />
      <div className="mb-3">
        <span className={`badge border ${sc.cls}`}>🚴 {sc.label}</span>
      </div>
      <h1 className={`font-bebas text-white leading-none mt-2 ${large ? 'text-7xl xl:text-8xl' : 'text-6xl sm:text-7xl'}`}>
        TOUR DE<br />
        <span className="text-page" style={{ fontSize: large ? '1.15em' : '1.1em' }}>CHIRO</span>
      </h1>
      <div className={`font-bebas text-black leading-none mb-8 -mt-1 ${large ? 'text-6xl' : 'text-5xl'}`}>
        2026
      </div>
      <div>
        <div className="font-barlow-condensed font-bold text-[10px] uppercase tracking-[0.2em] text-page/50 mb-2">
          Countdown tot het event
        </div>
        <CountdownPills time={time} large={large} />
      </div>
    </div>
  )
}

/* ── Dashboard (leader + nav grid) ───────────────────────── */
function DashContent({ teams, config }) {
  const sorted = [...teams].sort((a, b) => b.total_points - a.total_points)
  const leader = sorted[0]

  return (
    <div className="flex flex-col justify-center px-6 lg:px-10 py-10 gap-5">
      {/* Leader card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="card p-5 lg:p-6"
        style={leader ? { borderLeftWidth: 4, borderLeftColor: leader.kleur } : {}}
      >
        <div className="font-barlow-condensed font-bold text-[10px] uppercase tracking-[0.2em] text-muted mb-3">
          🟡 Huidig leider
        </div>
        {leader ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-bebas text-4xl lg:text-5xl leading-none text-white">{leader.naam}</div>
              {sorted.length > 1 && leader.total_points > sorted[1].total_points && (
                <div className="text-xs text-muted font-barlow-condensed mt-1">
                  <span className="text-yellow">{leader.total_points - sorted[1].total_points} pt</span>
                  {' '}voor op {sorted[1].naam}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="font-bebas text-5xl lg:text-6xl text-yellow leading-none">{leader.total_points}</div>
              <div className="text-[10px] font-barlow-condensed font-semibold uppercase text-muted tracking-widest">punten</div>
            </div>
          </div>
        ) : (
          <div className="text-muted font-barlow text-sm">Nog geen scores ingevoerd</div>
        )}
      </motion.div>

      {/* Nav grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="grid grid-cols-2 gap-3"
      >
        {navButtons.map(({ to, label, icon: Icon }, i) => (
          <motion.div key={to} whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
            <Link
              to={to}
              className="card flex flex-col items-center gap-2 p-5 lg:p-7 hover:border-yellow/50 hover:shadow-lg hover:shadow-yellow/5 hover:-translate-y-0.5 transition-all block group"
            >
              <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-yellow" />
              <span className="font-barlow-condensed font-bold text-[11px] uppercase tracking-wider text-white group-hover:text-yellow transition-colors">
                {label}
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export default function Home() {
  const { teams, config } = useApp()
  const time = useCountdown(config.start_date)

  return (
    <div className="page-enter">
      {/* ── MOBILE layout (< 1024px) ─────────────────────── */}
      <div className="lg:hidden min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-yellow relative"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 82%, 0 100%)',
            minHeight: '52vh',
            paddingBottom: '10%',
          }}
        >
          <HeroContent time={time} config={config} />
        </motion.div>
        <div className="-mt-4 relative z-10">
          <DashContent teams={teams} config={config} />
        </div>
      </div>

      {/* ── DESKTOP layout (>= 1024px) ───────────────────── */}
      <div className="hidden lg:grid min-h-[calc(100vh-3.5rem)]" style={{ gridTemplateColumns: '58% 42%' }}>
        {/* Left: yellow hero */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="bg-yellow relative"
          style={{ clipPath: 'polygon(0 0, 100% 0, 91% 100%, 0 100%)' }}
        >
          <HeroContent time={time} config={config} large />
        </motion.div>

        {/* Right: dark dashboard */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="-ml-8 overflow-y-auto"
        >
          <DashContent teams={teams} config={config} />
        </motion.div>
      </div>
    </div>
  )
}
