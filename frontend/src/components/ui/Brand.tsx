import type { ReactNode } from 'react'

export function Logo({ dark = false }: { dark?: boolean }) {
  const textColor = dark ? '#08080d' : 'var(--text-1)'
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <span className="relative grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--accent-grad)] shadow-[var(--glow-accent)]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6.5 17V6.2h2l3 4.7.3.01V6.2h2V17h-2l-3-4.9h-.3V17h-2Zm9.4 0-3.4-10.8h2.1l2.4 8 2.4-8h2L14 17h1.9Z"
            fill="#08080d"
          />
        </svg>
      </span>
      <span className="font-display text-[19px] font-semibold tracking-tight" style={{ color: textColor }}>
        Doc<span className="font-bold">Mind</span>
      </span>
    </span>
  )
}

export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-[9px] bg-[var(--accent-grad)] shadow-[var(--glow-accent)]"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.53} height={size * 0.53} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6.5 17V6.2h2l3 4.7.3.01V6.2h2V17h-2l-3-4.9h-.3V17h-2Zm9.4 0-3.4-10.8h2.1l2.4 8 2.4-8h2L14 17h1.9Z"
          fill="#08080d"
        />
      </svg>
    </span>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(/[@\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'

  const dims = { sm: 28, md: 36, lg: 44 }[size]
  const fontSize = { sm: 11, md: 14, lg: 17 }[size]

  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold text-[var(--bg-0)]"
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
  neutral: 'text-[var(--text-2)] bg-[rgba(255,255,255,0.07)]',
}

export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.07)] px-2.5 py-0.5 text-[11.5px] font-medium ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}