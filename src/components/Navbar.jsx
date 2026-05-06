import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Radio, BarChart2, Disc, Trophy, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

const bottomLinks = [
  { to: '/',          label: 'Home',      icon: Home },
  { to: '/teams',     label: 'Teams',     icon: Users },
  { to: '/live',      label: 'Live',      icon: Radio },
  { to: '/rankings',  label: 'Stand',     icon: BarChart2 },
  { to: '/strafwiel', label: 'Strafwiel', icon: Disc },
]

const topLinks = [
  { to: '/',          label: 'Home' },
  { to: '/teams',     label: 'Teams' },
  { to: '/rankings',  label: 'Klassement' },
  { to: '/stage/1',   label: 'Stage 1' },
  { to: '/stage/2',   label: 'Stage 2' },
  { to: '/stage/3',   label: 'Stage 3' },
  { to: '/live',      label: 'Live' },
  { to: '/strafwiel', label: 'Strafwiel' },
  { to: '/admin',     label: 'Admin' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const isActive = (to) => to === '/' ? pathname === '/' : pathname.startsWith(to)

  return (
    <>
      {/* ── Desktop top nav ──────────────────────────────── */}
      <nav className="hidden md:block sticky top-0 z-50 h-16 bg-page/95 backdrop-blur-md border-b border-yellow/15">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">

          {/* Left 1/4: logo */}
          <div className="w-1/4">
            <Link to="/">
              <span className="font-bebas text-2xl text-yellow tracking-widest leading-none">
                TOUR DE CHIRO
              </span>
            </Link>
          </div>

          {/* Center 2/4: nav links */}
          <div className="w-2/4 flex items-center justify-center gap-1">
            {topLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3 py-1.5 font-barlow-condensed font-semibold text-[12px] uppercase tracking-[0.08em] transition-colors whitespace-nowrap ${
                  isActive(link.to) ? 'text-yellow' : 'text-muted hover:text-white'
                }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-yellow rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Right 1/4: empty placeholder */}
          <div className="w-1/4" />
        </div>
      </nav>

      {/* ── Mobile bottom nav ────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-page border-t border-line flex">
        {bottomLinks.map(({ to, label, icon: Icon }) => {
          const active = isActive(to)
          return (
            <Link
              key={to}
              to={to}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            >
              {active && (
                <div className="absolute top-0 left-2 right-2 h-0.5 bg-yellow rounded-b-full" />
              )}
              <Icon
                className={`w-5 h-5 transition-colors ${active ? 'text-yellow' : 'text-muted'}`}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span
                className={`font-barlow-condensed font-semibold text-[10px] uppercase tracking-wider transition-colors ${
                  active ? 'text-yellow' : 'text-muted'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
