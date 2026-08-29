import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Home } from 'lucide-react'
import { Logo } from '../components/ui/Brand'
import { Button } from '../components/ui/Button'

const digitAnimation = {
  initial: { opacity: 0, y: 34, scale: 0.9, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  transition: { type: 'spring' as const, stiffness: 220, damping: 20 },
}

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      <div className="aurora" aria-hidden />

      <div className="relative flex w-full max-w-lg flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="absolute -top-24">
          <Logo />
        </motion.div>

        <div aria-hidden className="relative flex items-center justify-center gap-x-2 sm:gap-x-3">
          <motion.span
            {...digitAnimation}
            transition={{ ...digitAnimation.transition, delay: 0.05 }}
            className="font-display text-[104px] font-bold leading-none tracking-tighter text-transparent sm:text-[132px]"
            style={{ WebkitTextStroke: '2px var(--accent-hi)' }}
          >
            4
          </motion.span>

          {/* Orbiting ring — a lone document still searching the vector space */}
          <span className="relative grid h-[86px] w-[86px] shrink-0 place-items-center sm:h-[104px] sm:w-[104px]">
            <span
              className="absolute h-[84%] w-[84%] rounded-full border border-[var(--accent)]/35 [animation:pulse-soft_4s_ease-in-out_infinite]"
            />
            <span
              className="absolute h-[56%] w-[56%] rounded-full border border-[var(--accent-2)]/30 [animation:pulse-soft_4s_ease-in-out_infinite_0.6s]"
            />
            <span className="absolute inset-0 [animation:orbit_5.5s_linear_infinite]">
              <span className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-grad)] shadow-[var(--glow-accent)]" />
            </span>
          </span>

          <motion.span
            {...digitAnimation}
            transition={{ ...digitAnimation.transition, delay: 0.12 }}
            className="font-display text-[104px] font-bold leading-none tracking-tighter text-transparent sm:text-[132px]"
            style={{ WebkitTextStroke: '2px var(--accent-hi)' }}
          >
            4
          </motion.span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          className="mt-8 font-display text-[26px] font-semibold tracking-tight sm:text-[30px]"
        >
          Lost in the <span className="gradient-text">vector space</span>?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.4 }}
          className="mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-[var(--text-3)]"
        >
          This page couldn’t be retrieved — it may have moved, been deleted, or
          never made it into the index at all.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            variant="secondary"
            onClick={() => void navigate(-1)}
            leftIcon={<ArrowLeft size={16} />}
            aria-label="Go back to the previous page"
          >
            Go Back
          </Button>
          <Link to="/">
            <Button leftIcon={<Home size={16} />}>Go Home</Button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}