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
        'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] text-xs font-medium transition-colors duration-150 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/40',
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
          <Moon size={14} strokeWidth={1.75} className="text-[#0E7490]" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  )
}
