export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="spin-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c6cff" />
          <stop offset="1" stopColor="#4cc9ff" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" stroke="var(--border-strong)" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="url(#spin-grad)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}