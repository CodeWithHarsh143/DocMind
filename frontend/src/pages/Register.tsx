import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { AuthLayout } from '../components/auth/AuthLayout'
import type { FormEvent } from 'react'

export default function RegisterPage() {
  const { register } = useAuth()
  const { success, error: throwError } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setFormError('Enter an email and password')
      return
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setFormError('Passwords do not match')
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      await register(email, password)
      success('Account created', 'Sign in to get started')
      navigate('/login')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed')
      throwError('Registration failed', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-[26px] font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-[14px] text-[var(--text-3)]">
        Start asking questions about your documents in minutes.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          type="email"
          label="Email"
          placeholder="you@company.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          label="Confirm password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {formError ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-[var(--radius-md)] border border-[var(--danger)]/40 bg-[var(--danger-soft)]/40 px-3.5 py-2.5 text-[13px] text-[var(--danger)]"
          >
            {formError}
          </motion.p>
        ) : null}

        <Button type="submit" loading={busy} size="lg" fullWidth className="mt-1">
          Create account
        </Button>
      </form>

      <div className="mt-6 text-center text-[13.5px] text-[var(--text-3)]">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[var(--accent-hi)] hover:underline">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}