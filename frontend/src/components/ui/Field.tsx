import { useId } from 'react'
import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'

const baseFieldStyles = `
w-full text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)]
bg-[var(--surface-2)]/80 border rounded-[var(--radius-md)]
transition-all duration-200
focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40
disabled:opacity-55 disabled:pointer-events-none
`

function borderClass(hasError: boolean | undefined) {
  return hasError
    ? 'border-[var(--danger)]/60 focus:border-[var(--danger)]'
    : 'border-[var(--border)] hover:border-[var(--border-strong)] focus:border-[var(--accent)]'
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className: extra, ...rest },
  ref,
) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-[13px] font-medium text-[var(--text-2)]">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        ref={ref}
        className={`${baseFieldStyles} h-11 px-3.5 ${borderClass(Boolean(error))} ${extra ?? ''}`}
        aria-invalid={Boolean(error)}
        {...rest}
      />
      {(error || hint) && (
        <div className={`flex items-center gap-1.5 text-xs ${error ? 'text-[var(--danger)]' : 'text-[var(--text-3)]'}`}>
          {error ? <AlertCircle size={13} /> : null}
          <span>{error ?? hint}</span>
        </div>
      )}
    </div>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className: extra, ...rest },
  ref,
) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-[13px] font-medium text-[var(--text-2)]">
          {label}
        </label>
      ) : null}
      <textarea
        id={id}
        ref={ref}
        className={`${baseFieldStyles} min-h-24 px-3.5 py-3 resize-none ${borderClass(Boolean(error))} ${extra ?? ''}`}
        aria-invalid={Boolean(error)}
        {...rest}
      />
      {(error || hint) && (
        <div className={`flex items-center gap-1.5 text-xs ${error ? 'text-[var(--danger)]' : 'text-[var(--text-3)]'}`}>
          {error ? <AlertCircle size={13} /> : null}
          <span>{error ?? hint}</span>
        </div>
      )}
    </div>
  )
})