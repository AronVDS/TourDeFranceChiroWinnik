import { useApp } from '../context/AppContext'

const typeCfg = {
  general:  { label: 'Algemeen', cls: 'bg-yellow/10 text-yellow border-yellow/30' },
  mountain: { label: '🏔️ Berg',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  sprint:   { label: '⚡ Sprint', cls: 'bg-green-500/10 text-green-400 border-green-500/30' },
}

export default function ChallengeCard({ challenge }) {
  const { teams } = useApp()
  const cfg = typeCfg[challenge.type] || typeCfg.general

  return (
    <div className="card rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-barlow-condensed font-bold text-lg text-white leading-tight">
            {challenge.naam}
          </h3>
          {challenge.power_stage && (
            <span className="inline-flex items-center gap-1 mt-1.5 badge border border-yellow/40 bg-yellow/10 text-yellow">
              ⚡ POWER STAGE — punten ×2
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge border ${cfg.cls}`}>{cfg.label}</span>
          <span className={`badge border ${
            challenge.completed
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-card-2 text-muted border-line'
          }`}>
            {challenge.completed ? '✅ Voltooid' : '⏳ Open'}
          </span>
        </div>
      </div>

      {/* Results */}
      {challenge.completed && challenge.results.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left pb-2 pr-3 font-barlow-condensed font-bold text-[10px] uppercase tracking-wider text-muted w-8">#</th>
              <th className="text-left pb-2 font-barlow-condensed font-bold text-[10px] uppercase tracking-wider text-muted">Team</th>
              <th className="text-right pb-2 font-barlow-condensed font-bold text-[10px] uppercase tracking-wider text-muted">Pts</th>
            </tr>
          </thead>
          <tbody>
            {[...challenge.results]
              .sort((a, b) => a.positie - b.positie)
              .map((result, idx) => {
                const team   = teams.find(t => t.id === result.team_id)
                const failed = result.geslaagd === false
                return (
                  <tr key={result.team_id} className={idx % 2 === 1 ? 'bg-card-2/50' : ''}>
                    <td className="py-1.5 pr-3 font-barlow-condensed font-semibold text-muted">
                      {failed ? '❌' : result.positie}
                    </td>
                    <td className="py-1.5 font-barlow-condensed font-semibold text-white">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: team?.kleur }} />
                        {team?.naam || 'Onbekend'}
                        {failed && <span className="text-muted text-xs font-barlow italic">(niet geslaagd)</span>}
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-bebas text-xl text-yellow">{result.punten}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      )}

      {!challenge.completed && (
        <div className="text-sm text-muted font-barlow italic">Resultaten nog niet ingevoerd</div>
      )}

      {challenge.notes && (
        <p className="text-muted text-sm mt-3 font-barlow italic border-t border-line pt-3">
          {challenge.notes}
        </p>
      )}
    </div>
  )
}
