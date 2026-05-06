import { useState } from 'react'
import { motion } from 'framer-motion'
import SpinWheel from '../components/SpinWheel'

export default function Strafwiel() {
  const [spinCount, setSpinCount] = useState(0)
  const [lastResult, setLastResult] = useState(null)

  const handleSpin = (result) => {
    setSpinCount(c => c + 1)
    setLastResult(result)
  }

  return (
    <div className="min-h-screen page-enter">
      <div className="max-w-2xl mx-auto px-5 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center mb-10"
        >
          <p className="font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.3em] text-muted mb-2">
            Chiro Edition
          </p>
          <h1 className="font-bebas text-7xl sm:text-8xl text-white leading-none tracking-widest">
            STRAF<span className="text-yellow">WIEL</span>
          </h1>
          <p className="text-muted font-barlow-condensed font-semibold text-sm mt-2 uppercase tracking-widest">
            Race Penalty System
          </p>
        </motion.div>

        {/* Wheel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex justify-center mb-10"
        >
          <SpinWheel onSpin={handleSpin} />
        </motion.div>

        {/* Stats blocks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="card p-5 text-center">
            <div className="font-barlow-condensed font-bold text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
              Daily Progress
            </div>
            <div className="font-bebas text-5xl text-yellow leading-none">{spinCount}</div>
            <div className="text-muted text-xs font-barlow-condensed mt-1">spins vandaag</div>
          </div>

          <div className="card p-5 text-center">
            <div className="font-barlow-condensed font-bold text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
              Laatste Sector
            </div>
            {lastResult ? (
              <>
                <div className="text-3xl mb-1">{lastResult.emoji}</div>
                <div className="font-bebas text-xl text-white leading-none">{lastResult.label}</div>
              </>
            ) : (
              <div className="font-bebas text-2xl text-muted leading-none mt-3">—</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
