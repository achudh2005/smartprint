import { Menu, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Link, useParams } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import ThemeToggle from '../ui/ThemeToggle'

export default function Header({ onMenuClick }) {
  const { user } = useAuth()
  const { shopId } = useParams()

  return (
    <header className="h-14 mac-vibrancy-header flex items-center px-4 sm:px-6 gap-3 shrink-0 transition-colors duration-150 sticky top-0 z-20">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>

      {/* macOS-style Quick Search / Spotlight Pill */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[var(--text-muted)] w-52 sm:w-64 hover:border-black/[0.15] dark:hover:border-white/[0.2] transition-colors cursor-pointer select-none">
        <Search size={13} strokeWidth={2} />
        <span className="flex-1 font-medium">Quick search...</span>
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-[#2c2c2e] text-[var(--text-muted)] border border-black/10 dark:border-white/10 rounded shadow-xs">
          ⌘K
        </kbd>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <NotificationBell shopId={shopId || user?.shops?.[0]?.id} />

        <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />

        <Link
          to="/profile"
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150"
        >
          <div className="w-6 h-6 rounded-md bg-[var(--accent-tint)] border border-[var(--border)] flex items-center justify-center shrink-0 shadow-xs">
            <span className="text-[11px] font-bold text-[#0E7490]">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="hidden sm:block text-xs font-semibold text-[var(--text)] leading-none">
            {user?.name}
          </span>
        </Link>
      </div>
    </header>
  )
}

