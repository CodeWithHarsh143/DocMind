import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          <motion.button
            aria-label="Close modal"
            className="absolute inset-0 cursor-default bg-[rgba(4,4,10,0.66)] backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface-1)] p-6 shadow-[var(--shadow-lg)] ${className ?? ''}`}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-[var(--radius-md)] text-[var(--text-3)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-1)]"
            >
              <X size={16} />
            </button>
            {title ? (
              <h2 className="font-display pr-8 text-[19px] font-semibold text-[var(--text-1)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1.5 text-sm text-[var(--text-3)]">{description}</p>
            ) : null}
            <div className="mt-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}