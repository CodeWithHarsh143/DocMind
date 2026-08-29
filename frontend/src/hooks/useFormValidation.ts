import { useCallback, useState } from 'react'
import type { RefObject } from 'react'
import type { ValidationResult } from '../utils/validation'

type FieldValidator<T> = (value: T) => ValidationResult

export interface UseField<T> {
  value: T
  error: ValidationResult
  touched: boolean
  invalid: boolean
  setValue: (value: T) => void
  onChange: (value: T) => void
  onBlur: () => void
  validate: () => ValidationResult
  reset: () => void
}

/**
 * A reusable controlled-field primitive with validate-on-change / on-blur /
 * on-submit behaviour. Empty values only surface their error after blur or
 * submit to avoid nagging while the user is about to type.
 */
export function useField<T>(validate: FieldValidator<T>, initialValue: T): UseField<T> {
  const [value, setValueState] = useState<T>(initialValue)
  const [touched, setTouched] = useState(false)

  const isEmpty = typeof value === 'string' ? value.trim() === '' : value == null

  const error: ValidationResult = !touched ? null : (validate(value) ?? null)

  const onChange = useCallback((next: T) => {
    setValueState(next)
    setTouched(true)
  }, [])

  const onBlur = useCallback(() => {
    setTouched(true)
  }, [])

  const validateField = useCallback(() => {
    setTouched(true)
    return validate(value) ?? null
  }, [validate, value])

  const reset = useCallback(() => {
    setValueState(initialValue)
    setTouched(false)
  }, [initialValue])

  return {
    value,
    error,
    touched,
    invalid: !isEmpty && error !== null,
    setValue: setValueState,
    onChange,
    onBlur,
    validate: validateField,
    reset,
  }
}

export interface FormErrors {
  [name: string]: ValidationResult
}

/**
 * Runs every field's validator, forcing them into the "touched" state so their
 * errors become visible, and returns true when the whole form is valid.
 */
export function validateForm(fields: Array<{ name: string; validate: () => ValidationResult }>): {
  valid: boolean
  errors: FormErrors
} {
  const errors: FormErrors = {}
  for (const field of fields) {
    const message = field.validate()
    if (message) errors[field.name] = message
  }
  return { valid: Object.keys(errors).length === 0, errors }
}

/** Focuses the first element whose ref is provided, typically the first invalid field. */
export function focusFirstInvalid(refs: Array<RefObject<HTMLElement | null>>): void {
  for (const ref of refs) {
    if (ref.current) {
      ref.current.focus()
      return
    }
  }
}