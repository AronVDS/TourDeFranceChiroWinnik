import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'

export default function RaceTrack({ teams: propTeams }) {
  const { teams: contextTeams } = useApp()
  const teams = propTeams || contextTeams

  const sorted = [...teams].sort((a, b) => b.total_points - a.total_points)
  const maxPts = Math.max(...teams.map(t => t.total_points), 1)

  return (
    <div className="space-y-3">
      {sorted.map((team, index) => {
        const pct = Math.max((team.total_points / maxPts) * 100, 3)
        return (
          <div key={team.id} className="flex items-center gap-2.5">
            {/* Rank outside lane */}
            <span className="font-bebas text-xl text-yellow w-6 text-center leading-none shrink-0">
              {index + 1}
            </span>

            {/* Track lane */}
            <div className="relative flex-1 h-[60px] bg-card-2 rounded-xl overflow-hidden border border-line">
              {/* Progress fill */}
              <motion.div
                className="absolute inset-y-0 left-0 rounded-xl"
                style={{ background: `linear-gradient(90deg, ${team.kleur}30, ${team.kleur}65)` }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.3, ease: 'easeOut' }}
              />

              {/* Team name on the lane */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                <span className="font-barlow-condensed font-bold text-white/85 text-sm leading-none drop-shadow-sm">
                  {team.naam}
                </span>
                <div className="font-bebas text-[11px] text-muted/70 leading-none mt-0.5">
                  {team.total_points} pts
                </div>
              </div>

              {/* Cyclist emoji at progress position */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 z-20"
                initial={{ left: '2%' }}
                animate={{ left: `max(2%, calc(${pct}% - 38px))` }}
                transition={{ duration: 1.3, ease: 'easeOut' }}
              >
                <span className="text-[32px] leading-none">🚴</span>
              </motion.div>

              {/* Finish line */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg opacity-15 select-none">🏁</div>

              {/* Percentage label */}
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <span className="font-barlow-condensed font-semibold text-[10px] text-muted/50">
                  {Math.round(pct)}%
                </span>
              </div>
            </div>
          </div>
        )
      })}

      {sorted.length === 0 && (
        <div className="text-center py-10 text-muted font-barlow text-sm">
          Nog geen teams om te tonen
        </div>
      )}

      <div className="text-center text-muted text-xs font-barlow-condensed font-semibold uppercase tracking-widest pt-3 border-t border-line">
        🏁 Finishlijn — gebaseerd op totale punten
      </div>
    </div>
  )
}
