import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Lock, LogOut, Save, ShieldCheck, X } from 'lucide-react'
import { useOrg } from '../context/OrgContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as orgApi from '../lib/organizations'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Field'
import { Badge } from '../components/ui/Brand'
import { AvatarUpload } from '../components/ui/AvatarUpload'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useField, validateForm, focusFirstInvalid } from '../hooks/useFormValidation'
import {
  organizationDescriptionValidator,
  organizationNameValidator,
} from '../utils/validation'
import type { OrganizationWithMembers } from '../types'

export default function OrganizationSettingsPage() {
  const { activeOrg } = useOrg()

  if (!activeOrg) return null

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] font-semibold tracking-tight">Organization settings</h1>
            <p className="mt-1 text-[14px] text-[var(--text-3)]">
              Branding and details for <span className="font-medium text-[var(--text-2)]">{activeOrg.name}</span>.
            </p>
          </div>
        </div>
        <OrganizationDetails key={activeOrg.id} org={activeOrg} />
      </motion.div>
    </div>
  )
}

function OrganizationDetails({ org }: { org: OrganizationWithMembers }) {
  const { activeOrg, updateOrganization, leaveOrganization } = useOrg()
  const { user } = useAuth()
  const { success, error: throwError } = useToast()
  const navigate = useNavigate()
  const isAdmin = activeOrg?.members?.[0]?.role === 'admin'
  const ownRole = activeOrg?.members?.[0]?.role ?? 'user'

  // ---- General info (admin only) ----
  const nameRef = useRef<HTMLInputElement>(null)
  const [baseline, setBaseline] = useState({ name: org.name, description: org.description ?? '' })
  const name = useField<string>(organizationNameValidator, org.name)
  const description = useField<string>(organizationDescriptionValidator, org.description ?? '')
  const [savingInfo, setSavingInfo] = useState(false)

  const dirty =
    name.value.trim() !== baseline.name.trim() ||
    description.value.trim() !== baseline.description.trim()
  const infoValid = !name.error && !description.error && dirty

  const handleSaveInfo = async () => {
    if (!isAdmin || savingInfo) return
    const { valid } = validateForm([
      { name: 'name', validate: name.validate },
      { name: 'description', validate: description.validate },
    ])
    if (!valid) {
      focusFirstInvalid([nameRef])
      return
    }
    setSavingInfo(true)
    try {
      await updateOrganization(org.id, {
        name: name.value.trim(),
        description: description.value.trim() || null,
      })
      setBaseline({ name: name.value.trim(), description: description.value.trim() })
      success('Organization updated', 'Your changes have been saved.')
    } catch (err) {
      throwError('Could not update organization', err instanceof Error ? err.message : undefined)
    } finally {
      setSavingInfo(false)
    }
  }

  // ---- Branding / logo ----
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [savingLogo, setSavingLogo] = useState(false)
  const logoUrl = logoFile ? logoPreview : org.logo_url ?? null

  const handleSaveLogo = async () => {
    if (!logoFile || savingLogo) return
    setSavingLogo(true)
    try {
      const { logo_url } = await orgApi.uploadLogo(org.id, logoFile)
      await updateOrganization(org.id, { logo_url })
      setLogoFile(null)
      success('Logo updated', 'The new logo is now in use.')
    } catch (err) {
      throwError('Could not upload logo', err instanceof Error ? err.message : undefined)
    } finally {
      setSavingLogo(false)
    }
  }

  // ---- Leave organization ----
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const handleLeave = async () => {
    if (!user || leaving) return
    setLeaving(true)
    try {
      await leaveOrganization(org.id, user.id)
      success('Left organization', `You are no longer a member of "${org.name}".`)
      setLeaveOpen(false)
      navigate('/app')
    } catch (err) {
      throwError('Could not leave', err instanceof Error ? err.message : undefined)
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* General info */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)]">
            <Building2 size={16} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-semibold">General information</h2>
            <p className="text-[12.5px] text-[var(--text-3)]">
              {isAdmin ? 'Editable by admins.' : 'Read-only — only admins can edit.'}
            </p>
          </div>
        </div>

        {isAdmin ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSaveInfo()
            }}
            noValidate
            className="flex flex-col gap-4"
          >
            <Input
              ref={nameRef}
              label="Organization name"
              value={name.value}
              error={name.error ?? undefined}
              onChange={(e) => name.onChange(e.target.value)}
              onBlur={name.onBlur}
              hint={`${name.value.length}/60`}
            />
            <div className="flex flex-col gap-1.5">
              <Textarea
                label="Description"
                placeholder="What is this workspace about?"
                value={description.value}
                error={description.error ?? undefined}
                onChange={(e) => description.onChange(e.target.value)}
                onBlur={description.onBlur}
              />
              <span className="self-end text-[11.5px] text-[var(--text-3)]">
                {description.value.length}/200
              </span>
            </div>
            <div className="flex justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                disabled={!dirty || savingInfo}
                onClick={() => {
                  name.setValue(baseline.name)
                  description.setValue(baseline.description)
                }}
                leftIcon={<X size={15} />}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={savingInfo}
                disabled={!infoValid}
                leftIcon={<Save size={15} />}
              >
                Save changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 px-4 py-3">
              <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-wider text-[var(--text-3)]">
                <Lock size={11} /> Organization name
              </div>
              <div className="mt-1 text-[14.5px] font-medium text-[var(--text-1)]">{org.name}</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 px-4 py-3">
              <div className="text-[11.5px] uppercase tracking-wider text-[var(--text-3)]">Description</div>
              <div className="mt-1 text-[13.5px] leading-relaxed text-[var(--text-2)]">
                {org.description || 'No description set.'}
              </div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 px-4 py-3">
              <div className="text-[11.5px] uppercase tracking-wider text-[var(--text-3)]">Created</div>
              <div className="mt-1 text-[13.5px] text-[var(--text-2)]">
                {new Date(org.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-3)]">
              <ShieldCheck size={13} className="text-[var(--accent-2)]" />
              Admins can edit these details.
            </div>
          </div>
        )}
      </section>

      {/* Branding */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)]">
            <Building2 size={16} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-semibold">Branding</h2>
            <p className="text-[12.5px] text-[var(--text-3)]">PNG, JPG or WebP · up to 5MB.</p>
          </div>
        </div>

        <div className="flex items-start gap-5">
          <AvatarUpload
            name={org.name}
            src={logoUrl}
            size={88}
            shape="rounded"
            uploading={savingLogo}
            onChange={(file) => {
              setLogoFile(file)
              if (file) setLogoPreview(URL.createObjectURL(file))
            }}
            className="basis-28"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[12.5px] leading-relaxed text-[var(--text-3)]">
              {isAdmin
                ? 'Pick a new logo to preview it here, then save to apply it.'
                : 'Only admins can change the organization logo.'}
            </p>
            {isAdmin ? (
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!logoFile || savingLogo}
                  loading={savingLogo}
                  onClick={() => void handleSaveLogo()}
                  leftIcon={<Save size={14} />}
                >
                  Save logo
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <p className="flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
        <ShieldCheck size={13} className="text-[var(--accent-2)]" />
        You are <Badge tone={ownRole === 'admin' ? 'info' : 'neutral'}>{ownRole === 'admin' ? 'Admin' : 'Member'}</Badge>{' '}
        of this organization.
      </p>

      {/* Leave organization */}
      <section
        className="rounded-[var(--radius-lg)] border border-[var(--danger)]/25 bg-[var(--danger-soft)]/30 p-5 sm:p-6"
      >
        <div className="mb-1 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--danger-soft)] text-[var(--danger)]">
            <LogOut size={16} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-semibold">Leave organization</h2>
            <p className="text-[12.5px] text-[var(--text-3)]">
              You will lose access to this workspace and its documents.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="danger" leftIcon={<LogOut size={15} />} onClick={() => setLeaveOpen(true)}>
            Leave organization
          </Button>
        </div>
        {ownRole === 'admin' ? (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
            <ShieldCheck size={13} />
            If you are the only admin, promote another member to admin before leaving.
          </p>
        ) : null}
      </section>

      <ConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => void handleLeave()}
        busy={leaving}
        title="Leave organization?"
        description={`You will lose access to "${org.name}" and its documents. This cannot be undone.`}
        confirmLabel="Leave organization"
      />
    </div>
  )
}