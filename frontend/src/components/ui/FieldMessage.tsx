import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Info } from 'lucide-react'

interface FieldMessageProps {
  id?: string
  error?: string | null
  hint?: string
}

/** Animated hint/error text shown beneath a form field. */
export function FieldMessage({ id, error, hint }: FieldMessageProps) {
  const message = error || hint
  const tone = error ? 'error' : 'hint'

  return (
    <div aria-live="polite">
      <AnimatePresence initial={false} mode="wait">
        {message ? (
          <motion.div
            key={`${tone}-${message}`}
            id={id}
            className={`flex min-h-[18px] items-center gap-1.5 text-xs leading-snug ${
              tone === 'error' ? 'text-[var(--danger)]' : 'text-[var(--text-3)]'
            }`}
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {tone === 'error' ? (
              <AlertCircle size={13} className="mt-px shrink-0" aria-hidden />
            ) : (
              <Info size={13} className="mt-px shrink-0" aria-hidden />
            )}
            <span>{message}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}