import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`grid h-9 w-9 place-items-center rounded-[var(--radius-md)] text-[var(--text-2)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-1)] ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
