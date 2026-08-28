import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { AuthLayout } from '../components/auth/AuthLayout'
import type { FormEvent } from 'react'

export default function LoginPage() {
  const { login } = useAuth()
  const { error: throwError } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setFormError('Enter your email and password')
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      await login(email, password)
      navigate('/app', { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Sign in failed')
      throwError('Sign in failed', err instanceof Error ? err.message : undefined)
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
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          Sign in
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