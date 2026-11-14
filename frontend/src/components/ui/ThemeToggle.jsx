import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon } from 'lucide-react'
import clsx from 'clsx'

export default function ThemeToggle({ className }) {
  const { toggleTheme, isDark } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={clsx(
        'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-hover text-xs font-medium transition-colors duration-150 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40',
        className
      )}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <>
          <Sun size={14} strokeWidth={1.75} className="text-amber-500 dark:text-amber-400" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon size={14} strokeWidth={1.75} className="text-primary-600 dark:text-primary-400" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  )
}
