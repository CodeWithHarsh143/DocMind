import type { ReactNode } from 'react'
import { resolveAssetUrl } from '../../lib/api'

/**
 * Shared DocMind glyph — the single source of truth for the logo mark.
 * Used by both <Logo/> and <BrandMark/> so any future brand refresh only
 * needs to be edited here.
 */
export function DocGlyph({ size = 17, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M6.5 17V6.2h2l3 4.7.3.01V6.2h2V17h-2l-3-4.9h-.3V17h-2Zm9.4 0-3.4-10.8h2.1l2.4 8 2.4-8h2L14 17h1.9Z"
        fill="var(--on-accent)"
      />
    </svg>
  )
}

/**
 * The brand mark alone — the gradient square containing the DocMind glyph.
 * Reuse this wherever a standalone logo/icon square is needed (empty states,
 * dropzones, auth screens) to keep the brand asset in one place.
 */
export function BrandMark({ size = 38, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`grid place-items-center rounded-[9px] bg-accent-grad shadow-[var(--glow-accent)] ${className}`}
      style={{ width: size, height: size }}
    >
      <DocGlyph size={size * 0.53} />
    </span>
  )
}

export function Logo({ dark = false, markSize = 32 }: { dark?: boolean; markSize?: number }) {
  const textColor = dark ? '#08080d' : 'var(--text-1)'
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <BrandMark size={markSize} />
      <span className="font-display text-[19px] font-semibold tracking-tight" style={{ color: textColor }}>
        Doc<span className="font-bold">Mind</span>
      </span>
    </span>
  )
}

export function Avatar({
  name,
  size = 'md',
  imageUrl = null,
  alt = '',
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  imageUrl?: string | null
  alt?: string
}) {
  const initials = name
    .split(/[@\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'

  const dims = { sm: 28, md: 36, lg: 44 }[size]
  const fontSize = { sm: 11, md: 14, lg: 17 }[size]

  const resolvedUrl = resolveAssetUrl(imageUrl)

  if (resolvedUrl) {
    return (
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-full"
        style={{ width: dims, height: dims }}
      >
        <img
          src={resolvedUrl}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      </span>
    )
  }

  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold text-[var(--on-accent)]"
      style={{
        width: dims,
        height: dims,
        fontSize,
        background: 'var(--accent-grad)',
      }}
    >
      {initials}
    </span>
  )
}

export interface BadgeProps {
  children: ReactNode
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  className?: string
}

const BADGE_TONES: Record<string, string> = {
  success: 'text-[var(--success)] bg-[var(--success-soft)]',
  warning: 'text-[var(--warning)] bg-[var(--warning-soft)]',
  danger: 'text-[var(--danger)] bg-[var(--danger-soft)]',
  info: 'text-[var(--accent-2)] bg-[var(--info-soft)]',
  neutral: 'text-[var(--text-2)] bg-[var(--hover-strong)]',
}

export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[11.5px] font-medium ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}