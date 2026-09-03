import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AtSign, BadgeCheck, Save, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiFetch } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { Badge } from '../components/ui/Brand'
import { AvatarUpload } from '../components/ui/AvatarUpload'
import { useField, validateForm, focusFirstInvalid } from '../hooks/useFormValidation'
import { nameValidator, phoneValidator } from '../utils/validation'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { success, error: throwError } = useToast()

  const [baseline, setBaseline] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    avatar_url: user?.avatar_url ?? null,
  })

  const name = useField<string>(nameValidator, user?.name ?? '')
  const phone = useField<string>(phoneValidator, user?.phone ?? '')

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const dirty =
    name.value.trim() !== baseline.name ||
    phone.value.trim() !== (baseline.phone ?? '') ||
    (avatarPreview !== null && avatarPreview !== baseline.avatar_url)
  const formValid = !name.error && !phone.error

  const handleSave = async () => {
    if (!formValid || !dirty || saving) return
    const { valid } = validateForm([
      { name: 'name', validate: name.validate },
      { name: 'phone', validate: phone.validate },
    ])
    if (!valid) {
      focusFirstInvalid([nameRef, phoneRef])
      return
    }

    setSaving(true)
    try {
      // TODO: OTP verification step before calling update API — backend pending.
      // (PATCH /auth/me updates name/phone; email changes require separate
      // verification handled on the backend.)
      let nextAvatar = baseline.avatar_url // when not changing avatar

      if (avatarFile && avatarPreview) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const { avatar_url } = await apiFetch<{ avatar_url: string }>(
          '/users/me/avatar',
          { method: 'POST', body: fd },
        )
        nextAvatar = avatar_url
      }

      await updateProfile({
        name: name.value.trim(),
        phone: phone.value.trim() || null,
        avatar_url: nextAvatar,
      })
      setBaseline({ name: name.value.trim(), phone: phone.value.trim(), avatar_url: nextAvatar })
      setAvatarFile(null)
      success('Profile updated', 'Your changes have been saved.')
    } catch (err) {
      throwError('Could not update profile', err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-6">
          <h1 className="font-display text-[26px] font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-[14px] text-[var(--text-3)]">
            Manage your personal details and how you appear across workspaces.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {/* Avatar */}
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-5 sm:p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <AvatarUpload
                name={name.value.trim() || user?.email || '?'}
                src={avatarFile ? avatarPreview : baseline.avatar_url}
                size={96}
                uploading={saving}
                onChange={(file) => {
                  setAvatarFile(file)
                  if (file) setAvatarPreview(URL.createObjectURL(file))
                }}
              />
              <div className="min-w-0 text-center sm:pt-2 sm:text-left">
                <h2 className="font-display text-[15px] font-semibold">Profile picture</h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-3)]">
                  PNG, JPG or WebP, up to 5MB. Picks a preview here — it's applied when
                  you save the form below.
                </p>
              </div>
            </div>
          </section>

          {/* Details */}
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/70 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)]">
                <ShieldCheck size={16} />
              </span>
              <div>
                <h2 className="font-display text-[15px] font-semibold">Personal information</h2>
                <p className="text-[12.5px] text-[var(--text-3)]">
                  Shown to admins when they manage workspace members.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleSave()
              }}
              noValidate
              className="flex flex-col gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  ref={nameRef}
                  label="Full name"
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  value={name.value}
                  error={name.error ?? undefined}
                  onChange={(e) => name.onChange(e.target.value)}
                  onBlur={name.onBlur}
                />
                <Input
                  ref={phoneRef}
                  type="tel"
                  label="Phone"
                  placeholder="+1 555 010 2030"
                  autoComplete="tel"
                  value={phone.value}
                  error={phone.error ?? undefined}
                  hint={phone.value ? `${phone.value.replace(/\D/g, '').length} digits` : 'Optional'}
                  onChange={(e) => phone.onChange(e.target.value)}
                  onBlur={phone.onBlur}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-email" className="text-[13px] font-medium text-[var(--text-2)]">
                  Email
                </label>
                <div className="flex h-11 items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]/50 px-3.5 text-sm text-[var(--text-2)]">
                  <AtSign size={14} className="shrink-0 text-[var(--text-3)]" />
                  <span className="min-w-0 flex-1 truncate">{user?.email}</span>
                  <Badge tone="success">
                    <BadgeCheck size={11} /> Verified
                  </Badge>
                </div>
                <p className="text-[11.5px] text-[var(--text-3)]">
                  Changing your email requires a one-time verification code. Contact support for now.
                </p>
              </div>

              <div className="flex justify-end border-t border-[var(--border-subtle)] pt-4">
                <Button
                  type="submit"
                  loading={saving}
                  disabled={!formValid || !dirty}
                  leftIcon={<Save size={15} />}
                >
                  Save changes
                </Button>
              </div>
            </form>
          </section>
        </div>
      </motion.div>
    </div>
  )
}