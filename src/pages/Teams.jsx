import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import TeamCard from '../components/TeamCard'

export default function Teams() {
  const { teams } = useApp()
  const sorted = [...teams].sort((a, b) => b.total_points - a.total_points)
  const maxPts = Math.max(...sorted.map(t => t.total_points), 1)

  return (
    <motion.div
      className="min-h-screen page-enter"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="max-w-4xl mx-auto px-5 py-10">

        <div className="mb-8">
          <p className="font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.3em] text-muted mb-1">
            🚴 Deelnemers
          </p>
          <h1 className="font-bebas text-6xl sm:text-7xl text-white leading-none mb-1">
            THE PELOTONS
          </h1>
          <p className="text-muted font-barlow text-sm">
            {teams.length} team{teams.length !== 1 ? 's' : ''} in competitie · gesorteerd op punten
          </p>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">👥</div>
            <p className="font-bebas text-2xl text-muted">Nog geen teams aangemaakt</p>
            <p className="text-sm text-muted font-barlow mt-1">Voeg teams toe via het admin paneel</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sorted.map((team, index) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.35 }}
                >
                  <TeamCard team={team} rank={index + 1} maxPts={maxPts} />
                </motion.div>
              ))}
            </div>

            {/* Stage breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.35 }}
              className="mt-12"
            >
              <div className="mb-4">
                <p className="font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.3em] text-muted mb-1">
                  Breakdown
                </p>
                <h2 className="font-bebas text-4xl text-white leading-none">Punten per Stage</h2>
              </div>

              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left px-5 py-3.5 font-barlow-condensed font-bold text-[10px] uppercase tracking-widest text-muted">Team</th>
                      <th className="text-center px-4 py-3.5 font-barlow-condensed font-bold text-[10px] uppercase tracking-widest text-muted">Stage 1</th>
                      <th className="text-center px-4 py-3.5 font-barlow-condensed font-bold text-[10px] uppercase tracking-widest text-muted">Stage 2</th>
                      <th className="text-center px-4 py-3.5 font-barlow-condensed font-bold text-[10px] uppercase tracking-widest text-muted">Stage 3</th>
                      <th className="text-right px-5 py-3.5 font-barlow-condensed font-bold text-[10px] uppercase tracking-widest text-muted">Totaal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((team, i) => (
                      <tr
                        key={team.id}
                        className="border-b border-line last:border-0 transition-colors hover:bg-card-2/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: team.kleur }} />
                            <span className="font-barlow-condensed font-semibold text-white text-sm">{team.naam}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-bebas text-xl text-muted">{team.stage1_points}</td>
                        <td className="px-4 py-4 text-center font-bebas text-xl text-muted">{team.stage2_points}</td>
                        <td className="px-4 py-4 text-center font-bebas text-xl text-muted">{team.stage3_points}</td>
                        <td className="px-5 py-4 text-right font-bebas text-2xl text-yellow">{team.total_points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  )
}
