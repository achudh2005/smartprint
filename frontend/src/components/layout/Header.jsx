import { Menu, Info } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Link, useParams } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import ThemeToggle from '../ui/ThemeToggle'

export default function Header({ onMenuClick }) {
  const { user } = useAuth()
  const { shopId } = useParams()

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-surface-200 dark:border-slate-800 flex items-center px-4 sm:px-6 gap-4 shrink-0 transition-colors duration-200">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-surface-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* About Button */}
        <Link
          to="/about"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 bg-surface-100 hover:bg-surface-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-surface-200 dark:border-slate-700 transition-all shadow-xs active:scale-95"
          title="About SmartPrint"
        >
          <Info size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />
          <span>About</span>
        </Link>

        <ThemeToggle />

        <NotificationBell shopId={shopId || user?.shops?.[0]?.id} />

        <Link to="/profile" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800 transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-200">{user?.name}</span>
        </Link>
      </div>
    </header>
  )
}
