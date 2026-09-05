import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Mail, MailOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Feedback'
import { Spinner } from '../components/ui/Spinner'
import { listMyInvites, acceptInvite, rejectInvite } from '../lib/invites'
import type { Invitation } from '../lib/invites'

export default function InvitationsPage() {
  const navigate = useNavigate()
  const { success, error: throwError } = useToast()
  const [invites, setInvites] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMyInvites()
      .then(setInvites)
      .catch(() => throwError('Could not load invites'))
      .finally(() => setLoading(false))
  }, [throwError])

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner size={28} />
      </div>
    )
  }

  if (invites.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <EmptyState
          icon={<MailOpen size={22} />}
          title="No pending invitations"
          description="When someone invites you to a workspace, it will show up here for you to accept or decline."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">Invitations</h1>
        <p className="mt-1 text-[14px] text-[var(--text-3)]">
          Workspaces you've been invited to join.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {invites.map((invite) => (
            <div
              key={invite.invited_email + invite.org_name}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)]">
                  <Mail size={18} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold text-[var(--text-1)]">{invite.org_name}</div>
                  <div className="truncate text-[12.5px] text-[var(--text-3)]">
                    {invite.inviter_name ?? 'Someone'} invited you to join this workspace.
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<X size={15} />}
                  onClick={async () => {
                    if (!invite.token) return
                    try {
                      await rejectInvite(invite.token)
                      setInvites((prev) => prev.filter((i) => i !== invite))
                      success('Invitation declined')
                    } catch (err) {
                      throwError('Could not decline', err instanceof Error ? err.message : undefined)
                    }
                  }}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Check size={15} />}
                  onClick={async () => {
                    if (!invite.token) return
                    try {
                      await acceptInvite(invite.token)
                      setInvites((prev) => prev.filter((i) => i !== invite))
                      success('Invitation accepted', `You joined ${invite.org_name}.`)
                      navigate('/app')
                    } catch (err) {
                      throwError('Could not accept', err instanceof Error ? err.message : undefined)
                    }
                  }}
                >
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
