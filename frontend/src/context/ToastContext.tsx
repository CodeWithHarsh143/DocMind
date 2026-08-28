/* oxlint-disable react/only-export-components -- context module: provider + hook pair */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, XCircle, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  description?: string
}

interface ToastContextValue {
  toast: (title: string, kind?: ToastKind, description?: string) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const COLORS: Record<ToastKind, string> = {
  success: 'var(--success)',
  error: 'var(--danger)',
  info: 'var(--accent-2)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (title: string, kind: ToastKind = 'info', description?: string) => {
      const id = ++counter.current
      setToasts((prev) => [...prev.slice(-3), { id, kind, title, description }])
      window.setTimeout(() => dismiss(id), 5200)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (t, d) => toast(t, 'success', d),
      error: (t, d) => toast(t, 'error', d),
      info: (t, d) => toast(t, 'info', d),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="toast-region"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.kind]
            const color = COLORS[t.kind]
            return (
              <motion.div
                key={t.id}
                className="toast"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <span className="toast-icon" style={{ color, background: `${color}1f` }}>
                  <Icon size={18} />
                </span>
                <div className="toast-body">
                  <div className="toast-title">{t.title}</div>
                  {t.description ? (
                    <div className="toast-desc">{t.description}</div>
                  ) : null}
                </div>
                <button
                  className="toast-close"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}