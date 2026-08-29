interface OrDividerProps {
  label?: string
  className?: string
}

export function OrDivider({ label = 'or', className = '' }: OrDividerProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span className="text-[11.5px] font-medium uppercase tracking-wider text-[var(--text-3)]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  )
}