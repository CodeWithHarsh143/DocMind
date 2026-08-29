import { useId, useState } from 'react'
import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { baseFieldStyles, borderClass } from './fieldStyles'
import { FieldMessage } from './FieldMessage'

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  hint?: string
  errorId?: string
}

/**
 * Password field with a built-in visibility toggle. Never logs or mirrors the
 * value anywhere outside the controlled input.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, error, hint, errorId, className: extra, ...rest },
  ref,
) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const describedBy = error || hint ? (errorId ?? `${id}-message`) : undefined

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-[13px] font-medium text-[var(--text-2)]">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          id={id}
          ref={ref}
          className={`${baseFieldStyles} h-11 pl-3.5 pr-11 ${borderClass(Boolean(error))} ${extra ?? ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] text-[var(--text-3)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error || hint ? (
        <FieldMessage id={describedBy} error={error} hint={hint} />
      ) : null}
    </div>
  )
})