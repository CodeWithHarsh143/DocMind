import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Crown,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
  Users,
  User,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { useToast } from '../context/ToastContext'
import { useOrgMembers } from '../hooks/useOrgMembers'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { Badge, Avatar } from '../components/ui/Brand'
import { StatusDot, EmptyState, SkeletonRows } from '../components/ui/Feedback'
import { FormErrorBanner } from '../components/ui/FormErrorBanner'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useField, validateForm, focusFirstInvalid } from '../hooks/useFormValidation'
import { emailValidator } from '../utils/validation'
import { formatDate } from '../lib/utils'
import type { OrgMember } from '../lib/orgMembers'
import type { OrganizationRole } from '../types'

function RoleBadge({ role }: { role: OrganizationRole }) {
  if (role === 'admin') {
    return (
      <Badge tone="info">
        <ShieldCheck size={11} /> Admin
      </Badge>
    )
  }
  return <Badge tone="neutral">Member</Badge>
}

export default function MembersPage() {
  const { user } = useAuth()
  const { activeOrg } = useOrg()
  const { success, error: throwError } = useToast()

  const ownRole = activeOrg?.members?.[0]?.role ?? 'user'
  const isAdmin = ownRole === 'admin'
  const orgId = activeOrg?.id ?? null

  const { members, loading, error, refresh, addMember, setRole, removeMember } = useOrgMembers(
    orgId,
    user,
    ownRole,
  )

  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<OrgMember | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const counts = useMemo(() => {
    const admins = members.filter((m) => m.role === 'admin').length
    const pending = members.filter((m) => m.status === 'pending').length
    return { total: members.length, admins, pending }
  }, [members])

  const handleRoleToggle = async (member: OrgMember) => {
    if (!isAdmin || member.user_id === user?.id) return
    setBusyId(member.id)
    try {
      const target = member.role === 'admin' ? 'user' : 'admin'
      await setRole(member.id, target)
      success(
        target === 'admin' ? 'Admin added' : 'Admin removed',
        `@ ${member.email} is now ${target === 'admin' ? 'an admin' : 'a member'}.`,
      )
    } catch (err) {
      throwError('Could not update role', err instanceof Error ? err.message : undefined)
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setBusyId(removeTarget.id)
    try {
      await removeMember(removeTarget.id)
      success('Member removed', `${removeTarget.email} was removed from the organization.`)
      setRemoveTarget(null)
    } catch (err) {
      throwError('Could not remove member', err instanceof Error ? err.message : undefined)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] font-semibold tracking-tight">Members</h1>
            <p className="mt-1 text-[14px] text-[var(--text-3)]">
              Manage who has access to <span className="font-medium text-[var(--text-2)]">{activeOrg?.name ?? 'this workspace'}</span>.
            </p>
          </div>
          {isAdmin ? (
            <Button leftIcon={<UserPlus size={16} />} onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          ) : null}
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3 sm:max-w-md">
          {[
            { label: 'Total', value: counts.total, icon: Users },
            { label: 'Admins', value: counts.admins, icon: ShieldCheck },
            { label: 'Pending', value: counts.pending, icon: User },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-3"
            >
              <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)]">
                <Icon size={14} />
              </span>
              <span>
                <span className="block font-display text-[17px] font-semibold leading-none text-[var(--text-1)]">
                  {value}
                </span>
                <span className="text-[11.5px] text-[var(--text-3)]">{label}</span>
              </span>
            </div>
          ))}
        </div>

        {error ? (
          <FormErrorBanner message={error.message} onRetry={() => void refresh()} />
        ) : loading ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-6">
            <SkeletonRows rows={4} />
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title="No members yet"
            description="Invite colleagues so they can upload documents and ask questions in this workspace."
            action={
              isAdmin ? (
                <Button size="sm" leftIcon={<UserPlus size={14} />} onClick={() => setInviteOpen(true)}>
                  Invite member
                </Button>
              ) : undefined
            }
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[11.5px] uppercase tracking-wider text-[var(--text-3)]">
                    <th className="px-5 py-3.5 font-medium">Member</th>
                    <th className="px-5 py-3.5 font-medium">Role</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5 font-medium">Joined</th>
                    {isAdmin ? <th className="px-5 py-3.5 text-right font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {members.map((member) => {
                    const isSelf = member.user_id === user?.id
                    return (
                      <tr key={member.id} className="transition-colors hover:bg-[var(--surface-2)]/60">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={member.name ?? member.email} size="md" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-[13.5px] font-medium text-[var(--text-1)]">
                                  {member.name ?? member.email}
                                </span>
                                {isSelf ? <Badge tone="neutral">you</Badge> : null}
                              </div>
                              <div className="truncate text-[12.5px] text-[var(--text-3)]">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <RoleBadge role={member.role} />
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-2 text-[12.5px] text-[var(--text-2)]">
                            <StatusDot tone={member.status === 'active' ? 'success' : 'warning'} />
                            {member.status === 'active' ? 'Active' : 'Invitation pending'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[12.5px] text-[var(--text-2)]">
                          {formatDate(member.joined_at)}
                        </td>
                        {isAdmin ? (
                          <td className="px-5 py-3.5">
                            {isSelf ? (
                              <span className="flex justify-end">
                                <Crown size={15} className="text-[var(--accent-2)]" />
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  title={
                                    member.role === 'admin'
                                      ? 'Remove admin'
                                      : 'Make admin — grants full workspace controls'
                                  }
                                  aria-label={
                                    member.role === 'admin'
                                      ? `Remove ${member.email} as admin`
                                      : `Make ${member.email} an admin`
                                  }
                                  onClick={() => void handleRoleToggle(member)}
                                  disabled={busyId === member.id}
                                  className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)] text-[var(--text-3)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent-hi)] disabled:opacity-50"
                                >
                                  {member.role === 'admin' ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                                </button>
                                <button
                                  type="button"
                                  title={`Remove ${member.email} from the organization`}
                                  aria-label={`Remove ${member.email} from the organization`}
                                  onClick={() => setRemoveTarget(member)}
                                  disabled={busyId === member.id}
                                  className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)] text-[var(--text-3)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-50"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="flex flex-col gap-3 md:hidden">
              {members.map((member) => {
                const isSelf = member.user_id === user?.id
                return (
                  <li
                    key={member.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name ?? member.email} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13.5px] font-medium text-[var(--text-1)]">
                            {member.name ?? member.email}
                          </span>
                          {isSelf ? <Badge tone="neutral">you</Badge> : null}
                        </div>
                        <div className="truncate text-[12.5px] text-[var(--text-3)]">{member.email}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <RoleBadge role={member.role} />
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
                        <StatusDot tone={member.status === 'active' ? 'success' : 'warning'} />
                        {member.status === 'active' ? 'Active' : 'Invitation pending'}
                      </span>
                      <span className="ml-auto text-[12px] text-[var(--text-3)]">
                        Joined {formatDate(member.joined_at)}
                      </span>
                    </div>
                    {isAdmin && !isSelf ? (
                      <div className="mt-3 flex gap-2 border-t border-[var(--border-subtle)] pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={
                            member.role === 'admin' ? <ShieldOff size={14} /> : <ShieldCheck size={14} />
                          }
                          loading={busyId === member.id}
                          onClick={() => void handleRoleToggle(member)}
                        >
                          {member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<Trash2 size={14} />}
                          loading={busyId === member.id}
                          onClick={() => setRemoveTarget(member)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}

        {isAdmin ? (
          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
            <ShieldCheck size={13} className="text-[var(--accent-hi)]" />
            Admin actions are only visible to workspace admins. Multiple admins are supported.
          </p>
        ) : null}
      </motion.div>

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        members={members}
        onInvite={async (input) => {
          await addMember(input)
          success('Invite sent', `We sent an invite to ${input.email}.`)
          setInviteOpen(false)
        }}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void handleRemove()}
        busy={removeTarget !== null && busyId === removeTarget.id}
        title="Remove member?"
        description={
          removeTarget
            ? `${removeTarget.email} will lose access to this workspace and its documents. This cannot be undone.`
            : undefined
        }
        confirmLabel="Remove member"
      />
    </div>
  )
}

interface InviteMemberModalProps {
  open: boolean
  onClose: () => void
  members: OrgMember[]
  onInvite: (input: { email: string; role: OrganizationRole }) => Promise<void>
}

function InviteMemberModal({ open, onClose, members, onInvite }: InviteMemberModalProps) {
  const { error: throwError } = useToast()

  const emailRef = useRef<HTMLInputElement>(null)
  const email = useField<string>((value) => {
    const base = emailValidator(value)
    if (base) return base
    if (members.some((m) => m.email.toLowerCase() === value.trim().toLowerCase())) {
      return 'That email is already a member of this organization.'
    }
    return null
  }, '')
  const [role, setRole] = useState<OrganizationRole>('user')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy) return
    const { valid } = validateForm([{ name: 'email', validate: email.validate }])
    if (!valid) {
      focusFirstInvalid([emailRef])
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      await onInvite({ email: email.value.trim(), role })
      email.reset()
      setRole('user')
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the invite.'
      setFormError(message)
      throwError('Invite failed', message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite a member"
      description="Send an invitation to join this workspace by email."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          ref={emailRef}
          type="email"
          label="Email"
          placeholder="colleague@company.com"
          autoComplete="email"
          value={email.value}
          error={email.error ?? undefined}
          onChange={(e) => email.onChange(e.target.value)}
          onBlur={email.onBlur}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[var(--text-2)]">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as OrganizationRole)}
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]/80 px-3.5 text-sm text-[var(--text-1)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          >
            <option value="user">Member — upload & ask questions</option>
            <option value="admin">Admin — manage members & settings</option>
          </select>
        </div>

        {formError ? <FormErrorBanner message={formError} /> : null}

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} leftIcon={<UserPlus size={15} />}>
            Send invite
          </Button>
        </div>
      </form>
    </Modal>
  )
}