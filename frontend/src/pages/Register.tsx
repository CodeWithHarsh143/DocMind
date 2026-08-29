import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { PasswordInput } from '../components/ui/PasswordInput'
import { PasswordRequirements } from '../components/ui/PasswordRequirements'
import { FormErrorBanner } from '../components/ui/FormErrorBanner'
import { AuthLayout } from '../components/auth/AuthLayout'
import { GoogleButton } from '../components/auth/GoogleButton'
import { OrDivider } from '../components/ui/OrDivider'
import { useField, validateForm, focusFirstInvalid } from '../hooks/useFormValidation'
import { emailValidator, passwordValidator, requiredValidator } from '../utils/validation'
import { friendlyErrorMessage, isNetworkError } from '../lib/errors'

export default function RegisterPage() {
  const { register } = useAuth()
  const { success: toastSuccess, error: throwError } = useToast()
  const navigate = useNavigate()

  const email = useField<string>(emailValidator, '')
  const password = useField<string>(passwordValidator, '')

  const confirmValidator = useCallback(
    (value: string) => {
      const required = requiredValidator('Please confirm your password.')(value)
      if (required) return required
      if (value !== password.value) return 'Passwords do not match.'
      return null
    },
    [password.value],
  )
  const confirmPassword = useField<string>(confirmValidator, '')

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [showRequirements, setShowRequirements] = useState(false)

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy) return

    const { valid } = validateForm([
      { name: 'email', validate: email.validate },
      { name: 'password', validate: password.validate },
      { name: 'confirmPassword', validate: confirmPassword.validate },
    ])
    if (!valid) {
      focusFirstInvalid([emailRef, passwordRef, confirmRef])
      return
    }

    setBusy(true)
    setFormError(null)
    setCanRetry(false)
    try {
      await register(email.value, password.value)
      toastSuccess('Account created', 'Sign in with your new credentials to get started.')
      navigate('/login', { replace: true })
    } catch (err) {
      const message = friendlyErrorMessage(err, 'Could not create your account.')
      setFormError(message)
      setCanRetry(isNetworkError(err))
      throwError('Registration failed', message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-[26px] font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-[14px] text-[var(--text-3)]">
        Start chatting with your documents in minutes — free.
      </p>

      <div className="mt-8">
        <GoogleButton />
      </div>
      <OrDivider className="mt-5" />

      <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-2.5">
        <div>
          <Input
            ref={emailRef}
            type="email"
            label="Email"
            placeholder="you@company.com"
            autoComplete="email"
            value={email.value}
            error={email.error ?? undefined}
            onChange={(e) => email.onChange(e.target.value)}
            onBlur={email.onBlur}
          />
        </div>

        <div className="mt-1.5">
          <PasswordInput
            ref={passwordRef}
            label="Password"
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
        </div>

        <AnimatePresence initial={false}>
          {showRequirements || password.touched ? (
            <PasswordRequirements value={password.value} />
          ) : null}
        </AnimatePresence>

        <div className="mt-1.5">
          <PasswordInput
            ref={confirmRef}
            label="Confirm password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            value={confirmPassword.value}
            error={confirmPassword.error ?? undefined}
            onChange={(e) => confirmPassword.onChange(e.target.value)}
            onBlur={confirmPassword.onBlur}
          />
        </div>

        <AnimatePresence initial={false}>
          {formError ? (
            <div className="mt-2">
              <FormErrorBanner
                message={formError}
                onRetry={canRetry ? () => void handleSubmit() : undefined}
              />
            </div>
          ) : null}
        </AnimatePresence>

        <Button type="submit" loading={busy} size="lg" fullWidth className="mt-2">
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <div className="mt-6 text-center text-[13.5px] text-[var(--text-3)]">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[var(--accent-hi)] hover:underline">
          Sign in
        </Link>
      </div>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-[var(--text-3)]">
        <Sparkles size={12} className="text-[var(--accent-2)]" />
        Streamed RAG answers · Workspace isolation · Markdown & code replies
      </p>
    </AuthLayout>
  )
}