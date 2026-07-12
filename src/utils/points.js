export function recalculateAllPoints(teams, challenges, bonusPenalties, quiz = {}, pointsPerQuestion = 0) {
  return teams.map(team => {
    let total_points = 0
    let mountain_points = 0
    let sprint_points = 0
    let junioren_points = 0
    let quiz_points = 0
    let stage1_points = 0
    let stage2_points = 0
    let stage3_points = 0
    let bonus_points = 0
    let penalty_points = 0

    challenges.filter(c => c.completed).forEach(challenge => {
      const result = challenge.results.find(r => r.team_id === team.id)
      if (!result) return
      const pts = result.punten
      total_points += pts
      if (challenge.stage_number === 1) stage1_points += pts
      if (challenge.stage_number === 2) stage2_points += pts
      if (challenge.stage_number === 3) stage3_points += pts
      if (challenge.type === 'mountain')  mountain_points += pts
      if (challenge.type === 'sprint')    sprint_points += pts
      if (challenge.type === 'junioren')  junioren_points += pts
    })

    bonusPenalties.filter(bp => bp.team_id === team.id).forEach(bp => {
      if (bp.type === 'bonus') {
        bonus_points += bp.punten
        total_points += bp.punten
      } else {
        penalty_points += bp.punten
        total_points -= bp.punten
      }
    })

    Object.values(quiz ?? {}).forEach(stageQuestions => {
      (stageQuestions ?? []).forEach(q => {
        if (q?.antwoorden?.[String(team.id)]) {
          quiz_points += pointsPerQuestion
          total_points += pointsPerQuestion
        }
      })
    })

    return {
      ...team,
      total_points,
      mountain_points,
      sprint_points,
      junioren_points,
      quiz_points,
      stage1_points,
      stage2_points,
      stage3_points,
      bonus_points,
      penalty_points,
    }
  })
}

export function calcResultPoints(index, totalTeams, isPowerStage) {
  const base = Math.max(0, totalTeams - 1 - index)
  return isPowerStage ? base * 2 : base
}
