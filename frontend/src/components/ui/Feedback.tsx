import type { ReactNode } from 'react'

interface StatusDotProps {
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

export function StatusDot({ tone }: StatusDotProps) {
  const colors: Record<string, string> = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
    info: 'var(--accent-2)',
    neutral: 'var(--text-3)',
  }
  return (
    <span
      aria-hidden
      className="relative inline-block h-2 w-2 rounded-full"
      style={{ background: colors[tone] }}
    >
      <span
        className="absolute inset-0 rounded-full animate-ping"
        style={{ background: colors[tone], animationDuration: '2s' }}
      />
    </span>
  )
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4 rounded-md"
          style={{ width: `${100 - i * 18}%`, height: 14 + (i % 2) * 6 }}
        />
      ))}
    </div>
  )
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] px-6 py-14 text-center ${className}`}
    >
      <div className="grid h-14 w-14 place-items-center rounded-[var(--radius-lg)] bg-[var(--accent-soft)] text-[var(--accent-2)]">
        {icon}
      </div>
      <div>
        <h3 className="font-display text-[17px] font-semibold text-[var(--text-1)]">{title}</h3>
        {description ? <p className="mt-1 max-w-sm text-sm text-[var(--text-3)]">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}