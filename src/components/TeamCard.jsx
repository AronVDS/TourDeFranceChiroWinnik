import { motion } from 'framer-motion'

const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

function geslachtIcon(waarde) {
  return waarde === 'jongen' ? '🧑' : waarde === 'meisje' ? '👧' : '❓'
}

export default function TeamCard({ team, rank, maxPts = 1 }) {
  const barWidth = maxPts > 0 ? (team.total_points / maxPts) * 100 : 0

  return (
    <motion.div
      whileHover={{ scale: 1.015, y: -3, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
      transition={{ duration: 0.18 }}
      className="card overflow-hidden"
      style={{ borderLeft: `6px solid ${team.kleur}` }}
    >
      <div className="p-8">
        {/* Top row: rank number + team info */}
        <div className="flex items-start gap-5">
          <div
            className="font-bebas text-[64px] leading-none shrink-0 select-none tabular-nums"
            style={{ color: `${team.kleur}66` }}
          >
            {rank}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <h3 className="font-bebas text-4xl leading-none text-white truncate">{team.naam}</h3>
              {medals[rank] && <span className="text-2xl leading-none shrink-0">{medals[rank]}</span>}
            </div>

            {/* LEIDING */}
            {(team.leden?.leiding?.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 mb-1.5">
                <span className="font-barlow-condensed font-bold text-[9px] uppercase tracking-wider text-yellow mr-0.5">👑 Leiding</span>
                {team.leden.leiding.map(lid => (
                  <span key={lid} className="text-[11px] bg-yellow/10 text-yellow/85 border border-yellow/25 px-2 py-0.5 rounded-full font-barlow-condensed font-semibold">
                    {geslachtIcon(team.leden?.geslacht?.[lid])} {lid}
                  </span>
                ))}
              </div>
            )}

            {/* ASPIS */}
            {(team.leden?.aspis?.length > 0) && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-barlow-condensed font-bold text-[9px] uppercase tracking-wider text-muted mr-0.5">🚴 Aspis</span>
                {team.leden.aspis.map(lid => (
                  <span key={lid} className="text-[11px] bg-card-2 text-muted border border-line px-2 py-0.5 rounded-full font-barlow-condensed font-semibold">
                    {geslachtIcon(team.leden?.geslacht?.[lid])} {lid}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Points row */}
        <div className="flex items-end justify-between mt-6">
          <div>
            <div className="font-barlow-condensed font-bold text-[9px] uppercase tracking-[0.2em] text-muted mb-1">Totaal</div>
            <div className="font-bebas text-5xl text-yellow leading-none">
              {team.total_points.toLocaleString()}
              <span className="text-muted text-base font-barlow-condensed font-semibold ml-1.5">pts</span>
            </div>
          </div>

          <div className="flex gap-6 pb-1">
            <div className="text-right">
              <div className="font-barlow-condensed font-bold text-[9px] uppercase tracking-widest text-muted mb-1">Berg</div>
              <div className="font-bebas text-4xl text-blue-400 leading-none">🏔️ {team.mountain_points}</div>
            </div>
            <div className="text-right">
              <div className="font-barlow-condensed font-bold text-[9px] uppercase tracking-widest text-muted mb-1">Sprint</div>
              <div className="font-bebas text-4xl text-green-400 leading-none">⚡ {team.sprint_points}</div>
            </div>
          </div>
        </div>

        {/* Bonus/penalty badges */}
        {(team.bonus_points > 0 || team.penalty_points > 0) && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-line">
            {team.bonus_points > 0 && (
              <span className="badge border border-green-500/30 bg-green-500/10 text-green-400">+{team.bonus_points} bonus</span>
            )}
            {team.penalty_points > 0 && (
              <span className="badge border border-red-500/30 bg-red-500/10 text-red-400">-{team.penalty_points} straf</span>
            )}
          </div>
        )}

        {/* Stage breakdown */}
        <div className="mt-5 pt-4 border-t border-line grid grid-cols-3 gap-3">
          {[['Stage 1', team.stage1_points], ['Stage 2', team.stage2_points], ['Stage 3', team.stage3_points]].map(([label, pts]) => (
            <div key={label} className="text-center">
              <div className="font-barlow-condensed font-bold text-[9px] uppercase tracking-widest text-muted mb-0.5">{label}</div>
              <div className="font-bebas text-2xl text-white leading-none">{pts ?? 0}</div>
            </div>
          ))}
        </div>

        {/* Points bar — gele fill */}
        <div className="mt-4">
          <div className="h-2 bg-card-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, rgba(255,214,0,0.55), #FFD600)' }}
              initial={{ width: 0 }}
              animate={{ width: `${barWidth}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
