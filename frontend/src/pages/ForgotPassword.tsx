import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react'
import { AuthLayout } from '../components/auth/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { PasswordInput } from '../components/ui/PasswordInput'
import { PasswordRequirements } from '../components/ui/PasswordRequirements'
import { FormErrorBanner } from '../components/ui/FormErrorBanner'
import { useToast } from '../context/ToastContext'
import { apiFetch } from '../lib/api'
import type { RefObject } from 'react'
import { useField, validateForm, focusFirstInvalid } from '../hooks/useFormValidation'
import {
  isValidEmail,
  passwordValidator,
  requiredValidator,
} from '../utils/validation'

type Phase = 'identify' | 'otp' | 'reset' | 'done'

const STEPS = ['Identify', 'Verify', 'Reset']

function maskIdentifier(value: string): string {
  const trimmed = value.trim()
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@')
    return `${local?.slice(0, 2) ?? ''}•••@${domain}`
  }
  const digits = trimmed.replace(/\D/g, '')
  return digits.length > 6 ? `${trimmed.slice(0, 3)}•••${trimmed.slice(-2)}` : trimmed
}

function identifierValidator(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Please enter your email or phone number.'
  if (trimmed.includes('@')) {
    return isValidEmail(trimmed) ? null : 'Enter a valid email address.'
  }
  return /^\+?\d[\d\s().-]{6,19}$/.test(trimmed)
    ? null
    : 'Enter a valid phone number (with country code).'
}

export default function ForgotPasswordPage() {
  const [phase, setPhase] = useState<Phase>('identify')
  const [identifier, setIdentifier] = useState('')
  const [identifierError, setIdentifierError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [verifiedCode, setVerifiedCode] = useState('')
  const identifierRef = useRef<HTMLInputElement>(null)

  const { error: throwError } = useToast()

  const stepIndex = useMemo(
    () => (phase === 'identify' ? 0 : phase === 'otp' ? 1 : phase === 'reset' ? 2 : 3),
    [phase],
  )

  const submitIdentifier = async () => {
    const message = identifierValidator(identifier)
    if (message) {
      setIdentifierError(message)
      identifierRef.current?.focus()
      return
    }
    setBusy(true)
    setIdentifierError(null)
    try {
      await apiFetch('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim() }),
        auth: false,
      })
      setPhase('otp')
    } catch {
      throwError('Could not send code', 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.24 }}
        >
          <Stepper current={stepIndex} />

          {phase === 'identify' ? (
            <IdentifyStep
              value={identifier}
              error={identifierError}
              busy={busy}
              inputRef={identifierRef}
              onValueChange={setIdentifier}
              onSubmit={() => void submitIdentifier()}
            />
          ) : null}

          {phase === 'otp' ? (
            <OtpStep
              identifier={identifier}
              onVerified={(code) => {
                setVerifiedCode(code)
                setPhase('reset')
              }}
              onBack={() => setPhase('identify')}
            />
          ) : null}

          {phase === 'reset' ? (
            <ResetStep
              identifier={identifier}
              code={verifiedCode}
              onBack={() => setPhase('otp')}
              onDone={() => setPhase('done')}
            />
          ) : null}

          {phase === 'done' ? <DoneStep /> : null}
        </motion.div>
      </AnimatePresence>
    </AuthLayout>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mb-6 flex items-center gap-1.5" aria-label="Recovery steps">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5">
            <span
              aria-hidden
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors ${
                done
                  ? 'bg-[var(--success-soft)] text-[var(--success)]'
                  : active
                    ? 'bg-accent-grad text-[var(--on-accent)]'
                    : 'border border-[var(--border-strong)] text-[var(--text-3)]'
              }`}
            >
              {done ? <CheckCircle2 size={13} /> : i + 1}
            </span>
            <span
              className={`hidden truncate text-[12px] font-medium sm:block ${
                active ? 'text-[var(--text-1)]' : 'text-[var(--text-3)]'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden
                className={`mx-1 h-px flex-1 ${done ? 'bg-[var(--success)]/50' : 'bg-[var(--border)]'}`}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

interface IdentifyStepProps {
  value: string
  error: string | null
  busy: boolean
  inputRef?: RefObject<HTMLInputElement | null>
  onValueChange: (value: string) => void
  onSubmit: () => void
}

function IdentifyStep({ value, error, busy, inputRef, onValueChange, onSubmit }: IdentifyStepProps) {
  return (
    <>
      <h1 className="font-display text-[24px] font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-1.5 text-[14px] text-[var(--text-3)]">
        Enter your email or phone number and we'll send you a one-time code.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        noValidate
        className="mt-7 flex flex-col gap-2.5"
      >
        <Input
          ref={inputRef}
          label="Email or phone"
          placeholder="you@company.com · +1 555 010 2030"
          inputMode="email"
          autoComplete="username"
          value={value}
          error={error ?? undefined}
          onChange={(e) => onValueChange(e.target.value)}
        />
        <Button type="submit" loading={busy} size="lg" fullWidth className="mt-2" leftIcon={<Send size={15} />}>
          {busy ? 'Sending code…' : 'Send reset code'}
        </Button>
      </form>
      <div className="mt-6 text-center text-[13.5px] text-[var(--text-3)]">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-[var(--accent-hi)] hover:underline">
          Back to sign in
        </Link>
      </div>
    </>
  )
}

const OTP_LENGTH = 6
const RESEND_COOLDOWN_S = 30

function OtpStep({
  identifier,
  onVerified,
  onBack,
}: {
  identifier: string
  onVerified: (code: string) => void
  onBack: () => void
}) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_S)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  const focusIndex = (i: number) => refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))]?.focus()

  const setDigitAt = (i: number, char: string) => {
    const digit = char.replace(/\D/g, '')
    if (!digit) return
    setDigits((prev) => {
      const next = [...prev]
      next[i] = digit
      return next
    })
    focusIndex(i + 1)
  }

  const clearAt = (i: number) => {
    setDigits((prev) => {
      const next = [...prev]
      next[i] = ''
      return next
    })
  }

  const handlePaste = (i: number, text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH)
    setDigits((prev) => {
      const next = [...prev]
      cleaned.split('').forEach((c, j) => {
        next[i + j] = c
      })
      return next
    })
    focusIndex(i + cleaned.length)
  }

  const complete = digits.every((d) => d.length === 1)

  const verify = async () => {
    if (!complete || verifying) return
    setVerifying(true)
    setError(null)
    try {
      const code = digits.join('')
      await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier, code }),
        auth: false,
      })
      onVerified(code)
    } catch {
      setError('That code did not verify. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const resend = async () => {
    try {
      await apiFetch('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
        auth: false,
      })
    } catch {
      // silently ignore — user can retry
    }
    setCountdown(RESEND_COOLDOWN_S)
    setDigits(Array(OTP_LENGTH).fill(''))
    focusIndex(0)
  }

  return (
    <>
      <h1 className="font-display text-[24px] font-semibold tracking-tight">Check your inbox</h1>
      <p className="mt-1.5 text-[14px] text-[var(--text-3)]">
        We sent a 6-digit code to <span className="font-medium text-[var(--text-2)]">{maskIdentifier(identifier)}</span>.
      </p>

      <div className="mt-7 flex flex-col items-center gap-4">
        <div className="flex gap-2" role="group" aria-label="One-time code">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el
              }}
              inputMode="numeric"
              maxLength={1}
              autoComplete="one-time-code"
              value={d}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => setDigitAt(i, e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !d && i > 0) {
                  clearAt(i - 1)
                  focusIndex(i - 1)
                }
                if (e.key === 'ArrowLeft') focusIndex(i - 1)
                if (e.key === 'ArrowRight') focusIndex(i + 1)
              }}
              onPaste={(e) => {
                e.preventDefault()
                handlePaste(i, e.clipboardData.getData('text'))
              }}
              className="h-13 w-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]/80 text-center font-display text-[18px] font-semibold text-[var(--text-1)] transition-all duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/40 sm:w-12"
            />
          ))}
        </div>

        {error ? <FormErrorBanner message={error} /> : null}

        <Button
          type="button"
          size="lg"
          fullWidth
          loading={verifying}
          disabled={!complete}
          onClick={() => void verify()}
        >
          {verifying ? 'Verifying…' : 'Verify code'}
        </Button>

        <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-3)]">
          <span>Didn't get it?</span>
          {countdown > 0 ? (
            <span className="tabular-nums text-[var(--text-2)]">Resend in {countdown}s</span>
          ) : (
            <button
              type="button"
              onClick={() => void resend()}
              className="font-medium text-[var(--accent-hi)] hover:underline"
            >
              Resend code
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-3)] hover:text-[var(--text-1)]"
        >
          <ArrowLeft size={13} /> Use a different email or phone
        </button>
      </div>
    </>
  )
}

function ResetStep({
  identifier,
  code,
  onBack,
  onDone,
}: {
  identifier: string
  code: string
  onBack: () => void
  onDone: () => void
}) {
  const password = useField<string>(passwordValidator, '')
  const confirmValidator = useCallback(
    (value: string) => {
      const base = requiredValidator('Please confirm your new password.')(value)
      if (base) return base
      if (value !== password.value) return 'Passwords do not match.'
      return null
    },
    [password.value],
  )
  const confirm = useField<string>(confirmValidator, '')

  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRequirements, setShowRequirements] = useState(false)

  const submit = async () => {
    const { valid } = validateForm([
      { name: 'password', validate: password.validate },
      { name: 'confirm', validate: confirm.validate },
    ])
    if (!valid) {
      focusFirstInvalid([passwordRef, confirmRef])
      return
    }
    setBusy(true)
    setError(null)
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          identifier,
          code,
          new_password: password.value,
        }),
        auth: false,
      })
      onDone()
    } catch {
      setError('We could not reset your password. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="font-display text-[24px] font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-1.5 text-[14px] text-[var(--text-3)]">
        Choose a strong password that you haven't used before.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        noValidate
        className="mt-7 flex flex-col gap-2.5"
      >
        <PasswordInput
          ref={passwordRef}
          label="New password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          value={password.value}
          error={password.error ?? undefined}
          onChange={(e) => {
            password.onChange(e.target.value)
            if (e.target.value.length > 0) setShowRequirements(true)
          }}
          onBlur={password.onBlur}
          onFocus={() => setShowRequirements(true)}
        />

        <AnimatePresence initial={false}>
          {showRequirements || password.touched ? <PasswordRequirements value={password.value} /> : null}
        </AnimatePresence>

        <div className="mt-1.5">
          <PasswordInput
            ref={confirmRef}
            label="Confirm new password"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            value={confirm.value}
            error={confirm.error ?? undefined}
            onChange={(e) => confirm.onChange(e.target.value)}
            onBlur={confirm.onBlur}
          />
        </div>

        <AnimatePresence initial={false}>
          {error ? <FormErrorBanner message={error} /> : null}
        </AnimatePresence>

        <Button type="submit" loading={busy} size="lg" fullWidth className="mt-2">
          {busy ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-3)] hover:text-[var(--text-1)]"
      >
        <ArrowLeft size={13} /> Back to the code
      </button>
    </>
  )
}

function DoneStep() {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="grid h-16 w-16 place-items-center rounded-full bg-[var(--success-soft)] text-[var(--success)]"
      >
        <CheckCircle2 size={30} />
      </motion.span>
      <h1 className="mt-5 font-display text-[24px] font-semibold tracking-tight">Password updated</h1>
      <p className="mt-1.5 max-w-xs text-[14px] leading-relaxed text-[var(--text-3)]">
        Your password has been reset. Sign in with your new credentials to get back to your documents.
      </p>
      <Link to="/login" className="mt-7 w-full">
        <Button size="lg" fullWidth leftIcon={<Mail size={15} />}>
          Go to sign in
        </Button>
      </Link>
    </div>
  )
}