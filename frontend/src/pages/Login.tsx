import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { PasswordInput } from '../components/ui/PasswordInput'
import { FormErrorBanner } from '../components/ui/FormErrorBanner'
import { AuthLayout } from '../components/auth/AuthLayout'
import { GoogleButton } from '../components/auth/GoogleButton'
import { OrDivider } from '../components/ui/OrDivider'
import { useField, validateForm, focusFirstInvalid } from '../hooks/useFormValidation'
import { emailValidator, requiredValidator } from '../utils/validation'
import { friendlyErrorMessage, isNetworkError } from '../lib/errors'

export default function LoginPage() {
  const { login } = useAuth()
  const { error: throwError } = useToast()
  const navigate = useNavigate()

  const email = useField<string>(emailValidator, '')
  const password = useField<string>(requiredValidator('Please enter your password.'), '')

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy) return

    const { valid } = validateForm([
      { name: 'email', validate: email.validate },
      { name: 'password', validate: password.validate },
    ])
    if (!valid) {
      focusFirstInvalid([emailRef, passwordRef])
      return
    }

    setBusy(true)
    setFormError(null)
    setCanRetry(false)
    try {
      await login(email.value, password.value)
      navigate('/app', { replace: true })
    } catch (err) {
      const message = friendlyErrorMessage(err, 'Sign in failed.')
      setFormError(message)
      setCanRetry(isNetworkError(err))
      throwError('Sign in failed', message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-[26px] font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-[14px] text-[var(--text-3)]">
        Sign in to continue chatting with your documents.
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
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password.value}
            error={password.error ?? undefined}
            onChange={(e) => password.onChange(e.target.value)}
onBlur={password.onBlur}
            />
        </div>

        <div className="mt-0.5 flex justify-end">
          <Link to="/forgot-password" className="text-[12.5px] font-medium text-[var(--accent-hi)] hover:underline">
            Forgot password?
          </Link>
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
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-6 text-center text-[13.5px] text-[var(--text-3)]">
        New to DocMind?{' '}
        <Link to="/register" className="font-medium text-[var(--accent-hi)] hover:underline">
          Create an account
        </Link>
      </div>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-[var(--text-3)]">
        <Sparkles size={12} className="text-[var(--accent-2)]" />
        Streamed RAG answers · Workspace isolation · Markdown & code replies
      </p>
    </AuthLayout>
  )
}