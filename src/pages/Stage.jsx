import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import ChallengeCard from '../components/ChallengeCard'

const stageAccent = { 1: 'text-green-400', 2: 'text-blue-400', 3: 'text-purple-400' }
const stageBadge  = { 1: 'bg-green-500/10 text-green-400 border-green-500/30', 2: 'bg-blue-500/10 text-blue-400 border-blue-500/30', 3: 'bg-purple-500/10 text-purple-400 border-purple-500/30' }

export default function Stage() {
  const { nummer } = useParams()
  const stageNum = parseInt(nummer)
  const { challenges } = useApp()

  const stageChallenges = challenges.filter(c => c.stage_number === stageNum)
  const completedCount = stageChallenges.filter(c => c.completed).length
  const openCount = stageChallenges.length - completedCount

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-5 py-10">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <span className={`badge border mb-3 inline-block ${stageBadge[stageNum] || stageBadge[1]}`}>
            STAGE {stageNum}
          </span>
          <h1 className={`font-bebas text-6xl leading-none mb-2 ${stageAccent[stageNum] || 'text-white'}`}>
            Stage {stageNum}
          </h1>

          {/* Progress */}
          {stageChallenges.length > 0 && (
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-1.5 bg-card-2 rounded-full overflow-hidden max-w-xs">
                <div
                  className="h-full bg-yellow rounded-full transition-all duration-700"
                  style={{ width: `${(completedCount / stageChallenges.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted font-barlow-condensed font-semibold">
                {completedCount}/{stageChallenges.length} voltooid
              </span>
            </div>
          )}

          <div className="flex gap-4 text-sm font-barlow-condensed font-semibold">
            <span className="text-muted">{stageChallenges.length} challenge{stageChallenges.length !== 1 ? 's' : ''}</span>
            {completedCount > 0 && <span className="text-green-400">✅ {completedCount} voltooid</span>}
            {openCount > 0 && <span className="text-yellow">⏳ {openCount} open</span>}
          </div>
        </motion.div>

        {stageChallenges.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="text-7xl mb-5">🚴</div>
            <p className="font-bebas text-2xl text-muted">Nog geen challenges voor Stage {stageNum}</p>
            <p className="text-muted font-barlow text-sm mt-2">Voeg challenges toe via het admin paneel</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stageChallenges.map((challenge, index) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
              >
                <ChallengeCard challenge={challenge} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
