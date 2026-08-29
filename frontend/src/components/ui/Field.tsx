import { useId } from 'react'
import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { FieldMessage } from './FieldMessage'
import { baseFieldStyles, borderClass } from './fieldStyles'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  errorId?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, errorId, className: extra, ...rest },
  ref,
) {
  const id = useId()
  const describedBy = error || hint ? (errorId ?? `${id}-message`) : undefined
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
        aria-describedby={describedBy}
        {...rest}
      />
      {error || hint ? (
        <FieldMessage id={describedBy} error={error} hint={hint} />
      ) : null}
    </div>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  errorId?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, errorId, className: extra, ...rest },
  ref,
) {
  const id = useId()
  const describedBy = error || hint ? (errorId ?? `${id}-message`) : undefined
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
        aria-describedby={describedBy}
        {...rest}
      />
      {error || hint ? (
        <FieldMessage id={describedBy} error={error} hint={hint} />
      ) : null}
    </div>
  )
})