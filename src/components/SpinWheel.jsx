import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, X } from 'lucide-react'

const SEGMENTS = [
  { label: 'Sock Beer',                       short: 'SOCK BEER',     emoji: '🧦' },
  { label: 'Adfundum met lepel',              short: 'LEPEL FUNDUM',  emoji: '🥄' },
  { label: 'Shot',                            short: 'SHOT',          emoji: '🥃' },
  { label: '2x Shot',                         short: '2x SHOT',       emoji: '🥃' },
  { label: 'Schoenfundum',                    short: 'SCHOEN FUNDUM', emoji: '👟' },
  { label: '0.5L Adfundum',                   short: '0.5L FUNDUM',  emoji: '🍺' },
  { label: 'Volgende opdracht zonder handen', short: 'ZONDER HANDEN', emoji: '🙌' },
]

const SEG_ANGLE = (2 * Math.PI) / SEGMENTS.length
const SIZE = 400

const YELLOW = '#FFD600'
const DARK   = '#22253A'

export default function SpinWheel({ onSpin }) {
  const canvasRef = useRef(null)
  const rotRef = useRef(0)
  const animRef = useRef(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [spinCount, setSpinCount] = useState(0)

  const draw = useCallback((rotation) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cx = SIZE / 2
    const cy = SIZE / 2
    const r = SIZE / 2 - 8

    ctx.clearRect(0, 0, SIZE, SIZE)

    SEGMENTS.forEach((seg, i) => {
      const isYellow = i % 2 === 0
      const start = rotation + i * SEG_ANGLE - Math.PI / 2
      const end = start + SEG_ANGLE
      const mid = start + SEG_ANGLE / 2

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = isYellow ? YELLOW : DARK
      ctx.fill()
      ctx.strokeStyle = '#12131A'
      ctx.lineWidth = 2
      ctx.stroke()

      // Segment text — radial, readable from center outward
      const labelR = r * 0.60
      const lx = labelR * Math.cos(mid)
      const ly = labelR * Math.sin(mid)
      const normalMid = ((mid % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      const flip = normalMid > Math.PI / 2 && normalMid < (3 * Math.PI) / 2

      ctx.save()
      ctx.translate(cx + lx, cy + ly)
      ctx.rotate(flip ? mid + Math.PI : mid)
      ctx.textAlign = 'center'
      ctx.fillStyle = isYellow ? '#000000' : '#FFFFFF'
      ctx.font = `24px serif`
      ctx.fillText(seg.emoji, 0, -7)
      ctx.font = `bold 13px "Barlow Condensed", sans-serif`
      ctx.fillText(seg.short, 0, 11)
      ctx.restore()
    })

    // Outer ring
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.strokeStyle = YELLOW
    ctx.lineWidth = 10
    ctx.stroke()

    // Center hub
    ctx.beginPath()
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI)
    ctx.fillStyle = '#12131A'
    ctx.fill()
    ctx.strokeStyle = YELLOW
    ctx.lineWidth = 3
    ctx.stroke()

    // Center dot
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, 2 * Math.PI)
    ctx.fillStyle = YELLOW
    ctx.fill()

    // Pointer triangle (top center) — bigger
    ctx.beginPath()
    ctx.moveTo(cx - 20, 2)
    ctx.lineTo(cx + 20, 2)
    ctx.lineTo(cx, 42)
    ctx.closePath()
    ctx.fillStyle = YELLOW
    ctx.strokeStyle = '#12131A'
    ctx.lineWidth = 3
    ctx.fill()
    ctx.stroke()
  }, [])

  useEffect(() => {
    document.fonts.ready.then(() => draw(rotRef.current))
  }, [draw])

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setResult(null)

    const extra = (7 + Math.random() * 7) * 2 * Math.PI
    const target = rotRef.current + extra
    const duration = 5000
    const startTime = performance.now()
    const startRot = rotRef.current

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      rotRef.current = startRot + (target - startRot) * eased
      draw(rotRef.current)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        const norm = ((rotRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        const idx = Math.floor(((2 * Math.PI - norm) / SEG_ANGLE) % SEGMENTS.length)
        const landed = SEGMENTS[idx]
        setResult(landed)
        setSpinning(false)
        setSpinCount(c => c + 1)
        onSpin?.(landed)
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Wheel */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-full"
          style={{ width: 'min(400px, 90vw)', height: 'min(400px, 90vw)' }}
        />
      </div>

      {/* Spin button */}
      <motion.button
        onClick={spin}
        disabled={spinning}
        whileHover={{ scale: spinning ? 1 : 1.04 }}
        whileTap={{ scale: spinning ? 1 : 0.97 }}
        className="btn-primary font-bebas text-3xl tracking-widest px-12 py-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {spinning ? 'DRAAIEND...' : (
          <span className="flex items-center gap-2">
            SPIN THE WHEEL <ChevronRight className="w-7 h-7" />
          </span>
        )}
      </motion.button>

      {/* Result modal */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.75, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              onClick={e => e.stopPropagation()}
              className="card-elevated rounded-2xl p-8 max-w-xs w-full text-center relative border border-yellow/30"
            >
              <button
                onClick={() => setResult(null)}
                className="absolute top-4 right-4 p-1.5 text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-7xl mb-4">{result.emoji}</div>
              <div className="font-bebas text-5xl text-yellow tracking-widest mb-2">{result.label}</div>
              <div className="text-muted text-sm font-barlow">Veel succes ermee! 🎉</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden spin count passthrough */}
      <input type="hidden" value={spinCount} />
    </div>
  )
}
