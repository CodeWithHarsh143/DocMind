import { motion } from 'framer-motion'
import { RotateCcw, TriangleAlert } from 'lucide-react'

interface FormErrorBannerProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
}

/** Inline form-level error with an optional retry action for network failures. */
export function FormErrorBanner({ message, onRetry, retryLabel = 'Retry' }: FormErrorBannerProps) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--danger)]/40 bg-[var(--danger-soft)]/50 px-3.5 py-3">
        <TriangleAlert size={15} className="mt-0.5 shrink-0 text-[var(--danger)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-snug text-[var(--danger)]">{message}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-2.5 py-1 text-[12.5px] font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]/70"
            >
              <RotateCcw size={12} aria-hidden />
              {retryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}