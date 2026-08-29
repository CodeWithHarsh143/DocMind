export type ValidationResult = string | null

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const REQUIRED_EMAIL = 'Please enter your email address.'
export const INVALID_EMAIL = 'Please enter a valid email address.'

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

export function emailValidator(value: string): ValidationResult {
  if (!value.trim()) return REQUIRED_EMAIL
  if (!isValidEmail(value)) return INVALID_EMAIL
  return null
}

export function requiredValidator(message: string): (value: string) => ValidationResult {
  return (value) => (value.trim() ? null : message)
}

export interface PasswordRule {
  key: string
  label: string
  test: (value: string) => boolean
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { key: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter (A–Z)', test: (v) => /[A-Z]/.test(v) },
  { key: 'lowercase', label: 'One lowercase letter (a–z)', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number (0–9)', test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: 'One special character (!@#$…)', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export const INVALID_PASSWORD =
  'Password must include 8+ characters, upper and lower case letters, a number and a special character.'

export interface PasswordRuleStatus {
  rule: PasswordRule
  passed: boolean
}

export function evaluatePasswordRules(value: string): PasswordRuleStatus[] {
  return PASSWORD_RULES.map((rule) => ({ rule, passed: rule.test(value) }))
}

export function isValidPassword(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value))
}

export function passwordValidator(value: string): ValidationResult {
  if (!value) return 'Please enter a password.'
  if (!isValidPassword(value)) return INVALID_PASSWORD
  return null
}

/** Number of satisfied rules, 0-5. */
export function passwordRuleCount(value: string): number {
  return PASSWORD_RULES.reduce((count, rule) => (rule.test(value) ? count + 1 : count), 0)
}

export const INVALID_NAME = 'Name should only contain letters.'
export const REQUIRED_NAME = 'Please enter your name.'

export function nameValidator(value: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) return REQUIRED_NAME
  if (!/^[A-Za-z\s]+$/.test(trimmed)) return INVALID_NAME
  if (trimmed.length > 60) return 'Name must be 60 characters or fewer.'
  return null
}

const PHONE_PATTERN = /^\+?\d[\d\s().-]{6,19}$/

export function phoneValidator(value: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) return null // optional field
  if (!PHONE_PATTERN.test(trimmed)) return 'Enter a valid phone number.'
  const digits = trimmed.replace(/\D/g, '').length
  if (digits < 7 || digits > 15) return 'Phone number must be 7–15 digits.'
  return null
}

export const REQUIRED_ORG_NAME = 'Organization name is required.'
export const INVALID_ORG_NAME =
  'Use letters, numbers, spaces and basic punctuation only (no special characters).'

export function organizationNameValidator(value: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) return REQUIRED_ORG_NAME
  if (trimmed.length < 2) return 'Organization name must be at least 2 characters.'
  if (trimmed.length > 60) return 'Organization name must be 60 characters or fewer.'
  if (!/^[A-Za-z0-9][A-Za-z0-9 _&'.,-]*$/.test(trimmed)) return INVALID_ORG_NAME
  return null
}

export function organizationDescriptionValidator(value: string): ValidationResult {
  const trimmed = value.trim()
  if (trimmed.length > 200) return 'Description must be 200 characters or fewer.'
  const hasControlChar = [...value].some((ch) => {
    const code = ch.charCodeAt(0)
    return code < 32 && code !== 9 && code !== 10 && code !== 13
  })
  if (hasControlChar) return 'Description contains unsupported characters.'
  return null
}