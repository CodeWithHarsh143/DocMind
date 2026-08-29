import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, RotateCcw } from 'lucide-react'
import { Logo } from '../components/ui/Brand'
import { Button } from '../components/ui/Button'

const digitAnimation = {
  initial: { opacity: 0, y: 30, scale: 0.92, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  transition: { type: 'spring' as const, stiffness: 240, damping: 22 },
}

export default function ServerErrorPage() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      <div className="aurora" aria-hidden />

      <div className="relative flex w-full max-w-lg flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="absolute -top-24">
          <Link to="/" aria-label="DocMind — go home">
            <Logo />
          </Link>
        </motion.div>

        {/* Broken signal: two nodes whose link keeps failing to connect */}
        <motion.svg
          aria-hidden
          width="176"
          height="72"
          viewBox="0 0 176 72"
          fill="none"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="[animation:floaty_4s_ease-in-out_infinite]"
          >
            <circle cx="22" cy="36" r="12" fill="rgba(124,108,255,0.16)" />
            <circle cx="22" cy="36" r="6" fill="var(--accent-hi)" />
          </motion.g>
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="[animation:floaty_4.6s_ease-in-out_infinite_0.3s]"
          >
            <circle cx="154" cy="36" r="12" fill="rgba(76,201,255,0.14)" />
            <circle cx="154" cy="36" r="6" fill="var(--accent-2)" />
          </motion.g>
          <line
            x1="40"
            y1="36"
            x2="140"
            y2="36"
            stroke="var(--border-strong)"
            strokeWidth="2"
            strokeDasharray="4 6"
            className="[animation:dash-flow_1.4s_linear_infinite]"
          />
          <motion.line
            x1="84"
            y1="20"
            x2="96"
            y2="52"
            stroke="var(--danger)"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.6, duration: 0.35 }}
          />
        </motion.svg>

        <div aria-hidden className="relative mt-6 flex items-baseline gap-x-2">
          {['5', '0', '0'].map((digit, i) => (
            <motion.span
              key={i}
              {...digitAnimation}
              transition={{ ...digitAnimation.transition, delay: 0.1 + i * 0.09 }}
              className="font-display text-[104px] font-bold leading-none tracking-tighter text-transparent sm:text-[128px]"
              style={{ WebkitTextStroke: '2px var(--accent-hi)' }}
            >
              {digit}
            </motion.span>
          ))}
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.4 }}
          className="mt-8 font-display text-[26px] font-semibold tracking-tight sm:text-[30px]"
        >
          Something went <span className="gradient-text">wrong</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.4 }}
          className="mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-[var(--text-3)]"
        >
          Our servers hit an unexpected problem while retrieving that request.
          Please try again in a moment — nothing on your side was lost.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.56, duration: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            onClick={() => window.location.reload()}
            leftIcon={<RotateCcw size={16} />}
            aria-label="Reconnect and try again"
          >
            Try Again
          </Button>
          <Link to="/">
            <Button variant="secondary" leftIcon={<Home size={16} />}>
              Go Home
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}