export function berekenInvloed(speler, team, allTeams) {
  const gesorteerd = [...allTeams].sort((a, b) => b.total_points - a.total_points)
  const positie = gesorteerd.findIndex(t => t.id === team.id) + 1

  const basePunten = team.total_points
  const isLeiding = (team.leden?.leiding ?? []).includes(speler)
  const multiplier = isLeiding ? 1.5 : 1.0
  const laatste = positie === allTeams.length ? -5 : 0

  return Math.round(basePunten * multiplier + laatste)
}

export function berekenAlleMVP(allTeams) {
  return allTeams
    .flatMap(team => {
      const leiding = team.leden?.leiding ?? []
      const aspis = team.leden?.aspis ?? []
      return [
        ...leiding.map(naam => ({ naam, team, rol: 'leiding', score: berekenInvloed(naam, team, allTeams) })),
        ...aspis.map(naam => ({ naam, team, rol: 'aspi', score: berekenInvloed(naam, team, allTeams) })),
      ]
    })
    .sort((a, b) => b.score - a.score)
}
