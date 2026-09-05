import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, LogIn, Mail, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AuthLayout } from '../components/auth/AuthLayout'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { getInvite, acceptInvite } from '../lib/invites'
import type { Invitation } from '../lib/invites'

export default function InvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { status, user } = useAuth()
  const { success, error: throwError } = useToast()

  const [invite, setInvite] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getInvite(token)
      .then(setInvite)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [token])

  const handleAccept = async () => {
    if (busy) return
    setBusy(true)
    try {
      await acceptInvite(token)
      success('Invitation accepted', `You joined ${invite?.org_name}.`)
      navigate('/app', { replace: true })
    } catch (err) {
      throwError('Could not accept invitation', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-[26px] font-semibold tracking-tight">You're invited!</h1>

      {loading ? (
        <div className="mt-8 grid place-items-center py-8">
          <Spinner size={28} />
        </div>
      ) : failed ? (
        <p className="mt-4 text-[14px] text-[var(--danger)]">
          This invitation is invalid or has already been used.
        </p>
      ) : (
        <div className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-5"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)]">
                <Mail size={18} />
              </span>
              <div>
                <div className="text-[15px] font-semibold text-[var(--text-1)]">{invite?.org_name}</div>
                <div className="text-[12.5px] text-[var(--text-3)]">
                  {invite?.inviter_name ?? 'Someone'} invited you to join this workspace.
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-2)] px-3 py-2 text-[12.5px] text-[var(--text-3)]">
              Invited email: <span className="font-medium text-[var(--text-2)]">{invite?.invited_email}</span>
            </div>
          </motion.div>

          <div className="mt-6">
            {status === 'loading' ? (
              <div className="grid place-items-center py-4">
                <Spinner size={24} />
              </div>
            ) : status === 'authenticated' ? (
              <Button onClick={handleAccept} loading={busy} size="lg" fullWidth leftIcon={<Check size={16} />}>
                {busy ? 'Joining…' : 'Accept invitation'}
              </Button>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Button
                  size="lg"
                  fullWidth
                  leftIcon={<LogIn size={16} />}
                  onClick={() => navigate(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)}
                >
                  Log in to accept
                </Button>
                <Button
                  size="lg"
                  fullWidth
                  variant="secondary"
                  leftIcon={<UserPlus size={16} />}
                  onClick={() => navigate(`/register?next=${encodeURIComponent(`/invite/${token}`)}`)}
                >
                  Create an account
                </Button>
              </div>
            )}
          </div>

          {user?.email && invite && user.email !== invite.invited_email ? (
            <p className="mt-4 text-center text-[12.5px] text-[var(--text-3)]">
              Signed in as <span className="font-medium text-[var(--text-2)]">{user.email}</span> — this invite
              was sent to {invite.invited_email}, so signing in with a different account may fail.
            </p>
          ) : null}

          <p className="mt-6 text-center text-[12.5px] text-[var(--text-3)]">
            Prefer to decide later?{' '}
            <Link to="/" className="font-medium text-[var(--accent-hi)] hover:underline">
              Continue to DocMind
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  )
}