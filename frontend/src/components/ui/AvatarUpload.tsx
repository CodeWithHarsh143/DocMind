import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, LoaderCircle } from 'lucide-react'
import { Avatar } from './Brand'
import { FieldMessage } from './FieldMessage'

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_AVATAR_SIZE_MB = 5

interface AvatarUploadProps {
  /** Fallback text used to derive initials when no image is set yet. */
  name: string
  /** Currently persisted image URL (may be null). */
  src?: string | null
  size?: number
  shape?: 'circle' | 'rounded'
  uploading?: boolean
  /** Called with a validated file when the user picks one (or null on discard). */
  onChange?: (file: File | null) => void
  error?: string | null
  className?: string
}

/**
 * Click-to-upload avatar/logo control. Validates type (jpg/png/webp) and size
 * (<= 5MB) client-side, shows a preview before the parent persists anything,
 * and renders an uploading spinner while `uploading` is true.
 */
export function AvatarUpload({
  name,
  src = null,
  size = 96,
  shape = 'circle',
  uploading = false,
  onChange,
  error = null,
  className = '',
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const radius = shape === 'circle' ? '9999px' : `max(12px, calc(${size}px * 0.18))`

  const handleFile = (file: File | undefined) => {
    setPickError(null)
    if (!file) return
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setPickError('Only JPG, PNG or WebP images are supported.')
      return
    }
    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      setPickError(`Image must be under ${MAX_AVATAR_SIZE_MB}MB.`)
      return
    }
    setPreview(URL.createObjectURL(file))
    onChange?.(file)
  }

  const showImage = preview ?? src

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change picture"
          title="Change picture"
          className="group relative grid shrink-0 place-items-center rounded-full transition-transform hover:scale-[1.03] disabled:opacity-70"
          style={{ width: size, height: size, borderRadius: radius }}
        >
          <span className="overflow-hidden" style={{ width: size, height: size, borderRadius: radius }}>
            <Avatar name={name} size="lg" imageUrl={showImage} alt={name} />
          </span>

          <span
            className="absolute inset-0 grid place-items-center rounded-full bg-[rgba(6,6,12,0.55)] opacity-0 transition-opacity group-hover:opacity-100"
            style={{ borderRadius: radius }}
          >
            <Camera size={size * 0.22} className="text-white" />
          </span>

          <AnimatePresence>
            {uploading ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 grid place-items-center rounded-full bg-[rgba(6,6,12,0.65)]"
                style={{ borderRadius: radius }}
              >
                <LoaderCircle size={size * 0.28} className="animate-spin text-white" />
              </motion.span>
            ) : null}
          </AnimatePresence>

          <span
            className="mt-2 text-[12.5px] font-medium text-[var(--accent-hi)]"
            style={{ position: 'absolute', bottom: -22 }}
          >
            {uploading ? 'Uploading…' : 'Change picture'}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_AVATAR_TYPES.join(',')}
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {(error || pickError) && (
        <div className="mt-6 text-center">
          <FieldMessage error={pickError ?? error} /></div>
      )}
    </div>
  )
}