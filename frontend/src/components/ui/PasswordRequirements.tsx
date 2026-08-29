import { AnimatePresence, motion } from 'framer-motion'
import { Check, Circle, X } from 'lucide-react'
import { evaluatePasswordRules } from '../../utils/validation'

interface PasswordRequirementsProps {
  value: string
  id?: string
}

function RuleIcon({ state }: { state: 'neutral' | 'passed' | 'failed' }) {
  if (state === 'passed') {
    return (
      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
        <Check size={11} strokeWidth={3} aria-hidden />
      </span>
    )
  }
  if (state === 'failed') {
    return (
      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
        <X size={11} strokeWidth={3} aria-hidden />
      </span>
    )
  }
  return <Circle size={10} className="shrink-0 text-[var(--text-3)]" aria-hidden />
}

/**
 * Live password strength checklist. Each rule shows a neutral / passed /
 * failed state that updates as the user types.
 */
export function PasswordRequirements({ value, id }: PasswordRequirementsProps) {
  const statuses = evaluatePasswordRules(value)
  const touched = value.length > 0

  return (
    <div
      id={id}
      className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]/60 p-3"
    >
      <div className="text-[11.5px] font-medium uppercase tracking-wider text-[var(--text-3)]">
        Password requirements
      </div>
      <ul className="flex flex-col gap-1.5">
        {statuses.map(({ rule, passed }) => {
          const state = !touched ? 'neutral' : passed ? 'passed' : 'failed'
          return (
            <li key={rule.key} className="flex items-center gap-2 text-[12.5px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={state}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.12 }}
                >
                  <RuleIcon state={state} />
                </motion.span>
              </AnimatePresence>
              <span
                className={
                  state === 'passed'
                    ? 'text-[var(--success)]'
                    : state === 'failed'
                      ? 'text-[var(--danger)]'
                      : 'text-[var(--text-3)]'
                }
              >
                {rule.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}