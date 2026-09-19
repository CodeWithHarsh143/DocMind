import { describe, it, expect } from 'vitest'
import {
  emailValidator,
  passwordValidator,
  nameValidator,
  phoneValidator,
  organizationNameValidator,
  organizationDescriptionValidator,
  isValidEmail,
  isValidPassword,
  evaluatePasswordRules,
  passwordRuleCount,
  requiredValidator,
} from '../utils/validation'

describe('emailValidator', () => {
  it('rejects empty input', () => {
    expect(emailValidator('')).toBe('Please enter your email address.')
    expect(emailValidator('  ')).toBe('Please enter your email address.')
  })

  it('rejects invalid emails', () => {
    expect(emailValidator('notanemail')).toBe('Please enter a valid email address.')
    expect(emailValidator('foo@')).toBe('Please enter a valid email address.')
    expect(emailValidator('@bar.com')).toBe('Please enter a valid email address.')
  })

  it('accepts valid emails', () => {
    expect(emailValidator('user@example.com')).toBeNull()
    expect(emailValidator('user.name+tag@domain.co')).toBeNull()
  })
})

describe('isValidEmail', () => {
  it('returns true for valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
  })

  it('returns false for invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
  })
})

describe('passwordValidator', () => {
  it('rejects empty password', () => {
    expect(passwordValidator('')).toBe('Please enter a password.')
  })

  it('rejects weak passwords', () => {
    expect(passwordValidator('short')).toBe(
      'Password must include 8+ characters, upper and lower case letters, a number and a special character.',
    )
    expect(passwordValidator('alllowercase1!')).toBe(
      'Password must include 8+ characters, upper and lower case letters, a number and a special character.',
    )
  })

  it('accepts strong passwords', () => {
    expect(passwordValidator('StrongPass1!')).toBeNull()
    expect(passwordValidator('C0mpl3x@Pass')).toBeNull()
  })
})

describe('isValidPassword', () => {
  it('returns true when all rules pass', () => {
    expect(isValidPassword('StrongPass1!')).toBe(true)
  })

  it('returns false when any rule fails', () => {
    expect(isValidPassword('nouppercase1!')).toBe(false)
  })
})

describe('evaluatePasswordRules', () => {
  it('returns 5 rules', () => {
    expect(evaluatePasswordRules('')).toHaveLength(5)
  })

  it('tracks which rules pass', () => {
    const statuses = evaluatePasswordRules('A')
    expect(statuses[0].passed).toBe(false) // length
    expect(statuses[1].passed).toBe(true) // uppercase
    expect(statuses[2].passed).toBe(false) // lowercase
    expect(statuses[3].passed).toBe(false) // number
    expect(statuses[4].passed).toBe(false) // special
  })

  it('passes all rules for a strong password', () => {
    const statuses = evaluatePasswordRules('Strong1!')
    expect(statuses.every((s) => s.passed)).toBe(true)
  })
})

describe('passwordRuleCount', () => {
  it('returns 0 for empty', () => {
    expect(passwordRuleCount('')).toBe(0)
  })

  it('returns 5 for a strong password', () => {
    expect(passwordRuleCount('Strong1!')).toBe(5)
  })
})

describe('nameValidator', () => {
  it('rejects empty name', () => {
    expect(nameValidator('')).toBe('Please enter your name.')
  })

  it('rejects names with numbers', () => {
    expect(nameValidator('John123')).toBe('Name should only contain letters.')
  })

  it('rejects names exceeding 60 chars', () => {
    expect(nameValidator('A'.repeat(61))).toBe('Name must be 60 characters or fewer.')
  })

  it('accepts valid names', () => {
    expect(nameValidator('John Doe')).toBeNull()
    expect(nameValidator('Alice')).toBeNull()
  })
})

describe('phoneValidator', () => {
  it('allows empty (optional field)', () => {
    expect(phoneValidator('')).toBeNull()
  })

  it('rejects invalid phones', () => {
    expect(phoneValidator('123')).toBe('Enter a valid phone number.')
  })

  it('accepts valid phones', () => {
    expect(phoneValidator('+1 555 010 2030')).toBeNull()
    expect(phoneValidator('+44 20 7946 0958')).toBeNull()
  })
})

describe('organizationNameValidator', () => {
  it('rejects empty name', () => {
    expect(organizationNameValidator('')).toBe('Organization name is required.')
  })

  it('rejects single char names', () => {
    expect(organizationNameValidator('A')).toBe('Organization name must be at least 2 characters.')
  })

  it('rejects names over 60 chars', () => {
    expect(organizationNameValidator('A'.repeat(61))).toBe(
      'Organization name must be 60 characters or fewer.',
    )
  })

  it('rejects names with special characters', () => {
    expect(organizationNameValidator('Org@#$')).toBe(
      'Use letters, numbers, spaces and basic punctuation only (no special characters).',
    )
  })

  it('accepts valid names', () => {
    expect(organizationNameValidator('Acme Corp')).toBeNull()
    expect(organizationNameValidator("Bob's Store")).toBeNull()
  })
})

describe('organizationDescriptionValidator', () => {
  it('allows empty descriptions', () => {
    expect(organizationDescriptionValidator('')).toBeNull()
  })

  it('rejects descriptions over 200 chars', () => {
    expect(organizationDescriptionValidator('A'.repeat(201))).toBe(
      'Description must be 200 characters or fewer.',
    )
  })

  it('accepts valid descriptions', () => {
    expect(organizationDescriptionValidator('A workspace for docs')).toBeNull()
  })
})

describe('requiredValidator', () => {
  it('returns message for empty value', () => {
    const validate = requiredValidator('This field is required.')
    expect(validate('')).toBe('This field is required.')
    expect(validate('  ')).toBe('This field is required.')
  })

  it('returns null for non-empty value', () => {
    const validate = requiredValidator('This field is required.')
    expect(validate('hello')).toBeNull()
  })
})
