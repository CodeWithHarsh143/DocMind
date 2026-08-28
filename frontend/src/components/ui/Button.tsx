import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface BaseButtonProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, BaseButtonProps {}

const className = `
inline-flex items-center justify-center gap-2 font-medium tracking-tight
transition-all duration-200 will-change-transform select-none
disabled:opacity-55 disabled:pointer-events-none
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]
`

const variants: Record<Variant, string> = {
  primary: 'text-white bg-[var(--accent-grad)] shadow-[var(--shadow-sm)] hover:shadow-[var(--glow-accent)] hover:-translate-y-px active:translate-y-0',
  secondary:
    'text-[var(--text-1)] bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] hover:border-[var(--border-strong)] active:translate-y-px',
  outline:
    'text-[var(--text-1)] bg-transparent border border-[var(--border-strong)] hover:border-[var(--accent)] hover:text-white active:translate-y-px',
  ghost: 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[rgba(255,255,255,0.06)]',
  danger: 'text-white bg-gradient-to-b from-[#f37a97] to-[var(--danger)] hover:brightness-110 active:translate-y-px',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-[var(--radius-sm)]',
  md: 'h-10 px-4 text-sm rounded-[var(--radius-md)]',
  lg: 'h-12 px-6 text-[15px] rounded-[var(--radius-md)]',
  icon: 'h-9 w-9 rounded-[var(--radius-md)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className: extra,
    disabled,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        className,
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        extra ?? '',
      ].join(' ')}
      {...rest}
    >
      {loading ? <LoaderCircle size={16} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

export default Button