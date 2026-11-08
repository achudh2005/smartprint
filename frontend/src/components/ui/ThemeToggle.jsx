import { useTheme } from '../../hooks/useTheme'
import clsx from 'clsx'

export default function ThemeToggle({ className }) {
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={clsx(
        'relative inline-flex items-center p-1 rounded-full cursor-pointer select-none transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xs border',
        isDark
          ? 'bg-slate-900 border-slate-700 text-slate-300'
          : 'bg-slate-100 border-slate-300 text-slate-600',
        className
      )}
      title={isDark ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙'}
      aria-label="Toggle theme"
    >
      {/* Light Option with Sun Emoji */}
      <span
        className={clsx(
          'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200',
          !isDark
            ? 'bg-white text-amber-600 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        )}
      >
        <span className="text-sm leading-none">☀️</span>
        <span className="hidden sm:inline">Light</span>
      </span>

      {/* Dark Option with Moon Emoji */}
      <span
        className={clsx(
          'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200',
          isDark
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        )}
      >
        <span className="text-sm leading-none">🌙</span>
        <span className="hidden sm:inline">Dark</span>
      </span>
    </button>
  )
}
