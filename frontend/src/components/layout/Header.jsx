import { Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Link, useParams } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import ThemeToggle from '../ui/ThemeToggle'

export default function Header({ onMenuClick }) {
  const { user } = useAuth()
  const { shopId } = useParams()

  return (
    <header className="h-14 bg-[var(--surface)] border-b border-[var(--border)] flex items-center px-4 sm:px-6 gap-3 shrink-0 transition-colors duration-150">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <ThemeToggle />

        <NotificationBell shopId={shopId || user?.shops?.[0]?.id} />

        <Link
          to="/profile"
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors duration-150"
        >
          <div className="w-6 h-6 rounded-full bg-[var(--accent-tint)] border border-[var(--border)] flex items-center justify-center shrink-0">
            <span className="text-[11px] font-semibold text-[#0E7490]">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="hidden sm:block text-sm font-medium text-[var(--text)] leading-none">
            {user?.name}
          </span>
        </Link>
      </div>
    </header>
  )
}
