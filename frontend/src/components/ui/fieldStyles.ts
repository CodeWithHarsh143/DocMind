export const baseFieldStyles = `
w-full text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)]
bg-[var(--surface-2)]/80 border rounded-[var(--radius-md)]
transition-all duration-200
focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40
disabled:opacity-55 disabled:pointer-events-none
`

export function borderClass(hasError: boolean | undefined) {
  return hasError
    ? 'border-[var(--danger)]/70 focus:border-[var(--danger)] focus:ring-[var(--danger)]/30'
    : 'border-[var(--border)] hover:border-[var(--border-strong)] focus:border-[var(--accent)]'
}