function normalizeLeden(leden) {
  if (!leden) return { leiding: [], aspis: [] }
  if (Array.isArray(leden)) return { leiding: [], aspis: leden }
  return { leiding: leden.leiding ?? [], aspis: leden.aspis ?? [] }
}

export function berekenSpelerStats(speler, team, challenges = []) {
  const safeChall = Array.isArray(challenges) ? challenges : []
  let challenges_gespeeld = 0
  let punten_bijgedragen = 0

  for (const challenge of safeChall) {
    const result = challenge.results?.find(r => r.team_id === team.id)
    if (!result) continue
    if ((result.spelers ?? []).includes(speler)) {
      challenges_gespeeld++
      punten_bijgedragen += result.punten ?? 0
    }
  }

  const { leiding } = normalizeLeden(team.leden)
  const rol = leiding.includes(speler) ? 'leiding' : 'aspi'

  return {
    naam: speler,
    team_id: team.id,
    team_naam: team.naam ?? '',
    team_kleur: team.kleur ?? '#888',
    rol,
    challenges_gespeeld,
    punten_bijgedragen,
    mvp_score: punten_bijgedragen,
  }
}

export function berekenAllSpelerStats(teams = [], challenges = []) {
  if (!Array.isArray(teams)) return []
  const safeChall = Array.isArray(challenges) ? challenges : []

  return teams
    .flatMap(team => {
      const { leiding, aspis } = normalizeLeden(team.leden)
      return [...leiding, ...aspis].map(speler =>
        berekenSpelerStats(speler, team, safeChall)
      )
    })
    .sort((a, b) => b.mvp_score - a.mvp_score)
}

export function berekenJuniorenStats(teams = [], challenges = []) {
  if (!Array.isArray(teams)) return []
  const juniorenChallenges = (Array.isArray(challenges) ? challenges : []).filter(
    c => c.type === 'junioren'
  )

  return teams
    .flatMap(team => {
      const { aspis } = normalizeLeden(team.leden)
      return aspis.map(speler => berekenSpelerStats(speler, team, juniorenChallenges))
    })
    .sort((a, b) => b.mvp_score - a.mvp_score)
}
