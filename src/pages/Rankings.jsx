import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { berekenJuniorenStats, berekenAllSpelerStats } from '../utils/mvp'

const TABS = [
  { key: 'general',  label: 'Algemeen',  icon: '🏆', pointKey: 'total_points' },
  { key: 'mountain', label: 'Berg',      icon: '🏔️', pointKey: 'mountain_points' },
  { key: 'sprint',   label: 'Sprint',    icon: '⚡',  pointKey: 'sprint_points' },
  { key: 'junioren', label: 'Junioren',  icon: '🧒', pointKey: 'junioren_points' },
  { key: 'mvp',      label: 'MVP',       icon: '👑', pointKey: null },
]

const podiumBorder = ['border-yellow/30', 'border-gray-400/20', 'border-orange-500/20']
const podiumBg     = ['rgba(255,214,0,0.08)', 'rgba(192,192,192,0.06)', 'rgba(205,127,50,0.06)']
const podiumEmoji  = ['🥇', '🥈', '🥉']

const TAB_BAR_COLOR = {
  general:  '#FFD600',
  mountain: '#3B82F6',
  sprint:   '#22C55E',
  junioren: '#8B5CF6',
  mvp:      '#FFD600',
}

function MvpGenderList({ title, icon, players, accentColor }) {
  const top = players.slice(0, 8)
  return (
    <div>
      <p className="font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.3em] text-muted mb-3">
        {icon} {title}
      </p>
      {top.length === 0 ? (
        <div className="text-center py-8 text-muted font-barlow text-sm">
          Nog geen scores voor deze categorie
        </div>
      ) : (
        <div className="space-y-2">
          {top.map((player, i) => (
            <div
              key={`${player.naam}-${player.team_id}`}
              className="card rounded-xl px-4 py-3 flex items-center gap-3"
              style={i === 0 ? { background: `linear-gradient(135deg, ${accentColor}14, #1C1E2A)`, border: `1px solid ${accentColor}4D` } : {}}
            >
              <span
                className={`font-bebas text-2xl leading-none w-8 text-center shrink-0 ${i === 0 ? '' : 'text-muted'}`}
                style={i === 0 ? { color: accentColor } : {}}
              >
                {i === 0 ? '👑' : i + 1}
              </span>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: player.team_kleur }} />
              <div className="flex-1 min-w-0">
                <div className="font-barlow-condensed font-semibold text-white text-base leading-none truncate">
                  {player.naam}
                </div>
                <div className="text-muted text-xs font-barlow-condensed mt-0.5">
                  {player.team_naam} · {player.challenges_gespeeld} challenge{player.challenges_gespeeld !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-bebas text-xl leading-none" style={{ color: accentColor }}>
                  {player.punten_bijgedragen}
                </span>
                <span className="text-muted text-xs font-barlow-condensed ml-1">pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Rankings() {
  const { teams, challenges } = useApp()
  const [activeTab, setActiveTab] = useState('general')

  const tab     = TABS.find(t => t.key === activeTab)
  const sorted  = tab.pointKey ? [...teams].sort((a, b) => (b[tab.pointKey] ?? 0) - (a[tab.pointKey] ?? 0)) : []
  const maxPts  = Math.max(...sorted.map(t => t[tab.pointKey] ?? 0), 1)

  const totalPoints  = sorted.reduce((s, t) => s + t.total_points, 0)
  const mostMountain = [...sorted].sort((a, b) => b.mountain_points - a.mountain_points)[0]
  const mostSprint   = [...sorted].sort((a, b) => b.sprint_points   - a.sprint_points)[0]

  const juniorenStats = berekenJuniorenStats(teams, challenges).filter(p => p.mvp_score > 0)

  const allMvpStats        = activeTab === 'mvp' ? berekenAllSpelerStats(teams, challenges) : []
  const jongensStats       = allMvpStats.filter(p => p.geslacht === 'jongen')
  const meisjesStats       = allMvpStats.filter(p => p.geslacht === 'meisje')
  const nietIngesteldCount = allMvpStats.filter(p => !p.geslacht).length

  return (
    <div className="min-h-screen page-enter">
      <div className="max-w-3xl mx-auto px-5 py-10">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.3em] text-muted mb-1">
            🏆 Standen
          </p>
          <h1 className="font-bebas text-6xl text-white leading-none mb-6">Klassementen</h1>
        </motion.div>

        {/* Pill tabs */}
        <div className="flex gap-1.5 mb-6 p-1 bg-card border border-line rounded-xl">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2.5 px-2 rounded-lg font-barlow-condensed font-bold text-xs uppercase tracking-wide transition-all duration-200 border ${
                activeTab === t.key
                  ? 'text-black border-transparent'
                  : 'text-muted hover:text-white border-transparent'
              }`}
              style={activeTab === t.key ? { background: TAB_BAR_COLOR[t.key] } : {}}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeTab !== 'mvp' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2.5"
          >
            {sorted.map((team, index) => (
              <motion.div
                key={team.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
                className={`card rounded-xl px-4 py-3 min-h-[72px] flex items-center gap-4 ${
                  index < 3 ? `border ${podiumBorder[index]}` : ''
                }`}
                style={index < 3 ? { background: `linear-gradient(135deg, ${podiumBg[index]}, #1C1E2A)` } : {}}
              >
                <span className={`font-bebas text-[48px] leading-none w-14 text-center shrink-0 ${
                  index === 0 ? 'text-yellow' : index < 3 ? 'text-white/70' : 'text-muted'
                }`}>
                  {index < 3 ? podiumEmoji[index] : index + 1}
                </span>

                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: team.kleur }} />

                <div className="flex-1 min-w-0">
                  <span className="font-barlow-condensed font-semibold text-white text-base leading-none block truncate mb-2">
                    {team.naam}
                  </span>
                  <div className="h-1.5 bg-card-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: TAB_BAR_COLOR[activeTab] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${((team[tab.pointKey] ?? 0) / maxPts) * 100}%` }}
                      transition={{ duration: 0.8, delay: index * 0.05, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bebas text-3xl leading-none" style={{ color: TAB_BAR_COLOR[activeTab] }}>
                    {team[tab.pointKey] ?? 0}
                  </span>
                  <span className="text-muted text-xs font-barlow-condensed ml-1">pts</span>
                </div>
              </motion.div>
            ))}

            {sorted.length === 0 && (
              <div className="text-center py-16 text-muted font-barlow text-sm">
                Nog geen scores ingevoerd
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        )}

        {activeTab === 'mvp' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {nietIngesteldCount > 0 && (
              <div className="bg-yellow/10 border border-yellow/30 rounded-xl px-4 py-3 mb-5 text-sm font-barlow-condensed font-semibold text-yellow">
                ⚠️ {nietIngesteldCount} speler{nietIngesteldCount !== 1 ? 's' : ''} nog niet ingesteld — vul in via de Teams-tab
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <MvpGenderList title="Top MVP Jongens" icon="🧑" players={jongensStats} accentColor="#3B82F6" />
              <MvpGenderList title="Top MVP Meisjes" icon="👧" players={meisjesStats} accentColor="#EC4899" />
            </div>
          </motion.div>
        )}

        {/* Junioren: aspis ranking */}
        {activeTab === 'junioren' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
            className="mt-8"
          >
            <p className="font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.3em] text-muted mb-3">
              🧒 Aspis Ranking
            </p>
            {juniorenStats.length === 0 ? (
              <div className="text-center py-8 text-muted font-barlow text-sm">
                Nog geen junioren challenge resultaten met spelersselectie
              </div>
            ) : (
              <div className="space-y-2">
                {juniorenStats.slice(0, 8).map((player, i) => (
                  <motion.div
                    key={`${player.naam}-${player.team_id}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className="card rounded-xl px-4 py-3 flex items-center gap-3"
                    style={i === 0 ? {
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.08), #1C1E2A)',
                      border: '1px solid rgba(139,92,246,0.3)',
                    } : {}}
                  >
                    <span className={`font-bebas text-3xl leading-none w-9 text-center shrink-0 ${
                      i === 0 ? '' : 'text-muted'
                    }`}
                    style={i === 0 ? { color: '#8B5CF6' } : {}}>
                      {i === 0 ? '👑' : i + 1}
                    </span>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: player.team_kleur }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-barlow-condensed font-semibold text-white text-base leading-none truncate">
                        {player.naam}
                      </div>
                      <div className="text-muted text-xs font-barlow-condensed mt-0.5">
                        {player.team_naam} · {player.challenges_gespeeld} challenge{player.challenges_gespeeld !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bebas text-2xl leading-none" style={{ color: '#8B5CF6' }}>
                        {player.punten_bijgedragen}
                      </span>
                      <span className="text-muted text-xs font-barlow-condensed ml-1">pts</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Default stats (not junioren) */}
        {activeTab !== 'junioren' && sorted.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
            className="mt-8"
          >
            <p className="font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.3em] text-muted mb-3">
              Statistieken
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 rounded-xl text-center">
                <div className="font-barlow-condensed font-bold text-[10px] uppercase tracking-widest text-muted mb-2">
                  Totaal punten
                </div>
                <div className="font-bebas text-3xl text-yellow leading-none">{totalPoints}</div>
              </div>
              <div className="card p-4 rounded-xl text-center">
                <div className="font-barlow-condensed font-bold text-[10px] uppercase tracking-widest text-muted mb-2">
                  Meeste berg 🏔️
                </div>
                <div className="font-bebas text-base text-white leading-none truncate mb-0.5">
                  {mostMountain?.naam ?? '—'}
                </div>
                <div className="font-bebas text-2xl text-yellow leading-none">
                  {mostMountain?.mountain_points ?? 0}
                </div>
              </div>
              <div className="card p-4 rounded-xl text-center">
                <div className="font-barlow-condensed font-bold text-[10px] uppercase tracking-widest text-muted mb-2">
                  Meeste sprint ⚡
                </div>
                <div className="font-bebas text-base text-white leading-none truncate mb-0.5">
                  {mostSprint?.naam ?? '—'}
                </div>
                <div className="font-bebas text-2xl text-yellow leading-none">
                  {mostSprint?.sprint_points ?? 0}
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}
