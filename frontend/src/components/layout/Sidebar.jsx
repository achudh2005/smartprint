import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  Printer, LayoutDashboard, Store, Settings,
  User, LogOut, X, Info
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { Wordmark, MacTrafficLights } from '../ui'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/shops/new', icon: Store,           label: 'Create Shop' },
  { to: '/profile',   icon: User,            label: 'Profile' },
  { to: '/about',     icon: Info,            label: 'About' },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully.')
    navigate('/login')
  }

  return (
    <>
      {/* Desktop macOS Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-60 mac-vibrancy-sidebar h-full shrink-0 transition-colors duration-150 select-none">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-64 mac-sheet transform transition-transform duration-150 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/[0.08] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <MacTrafficLights size="sm" onClose={onClose} />
            <LogoMark />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            aria-label="Close sidebar"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
        <SidebarContent user={user} onLogout={handleLogout} hideLogo />
      </aside>
    </>
  )
}

function LogoMark() {
  return (
    <Link to="/dashboard" className="inline-flex items-center">
      <Wordmark size="sm" showMark={true} />
    </Link>
  )
}

function SidebarContent({ user, onLogout, hideLogo }) {
  return (
    <div className="flex flex-col h-full">
      {/* macOS Window Titlebar Chrome with Traffic Lights */}
      {!hideLogo && (
        <div className="h-14 px-4.5 flex items-center gap-3 border-b border-black/[0.08] dark:border-white/[0.08] shrink-0">
          <MacTrafficLights size="md" />
          <div className="h-3.5 w-px bg-black/[0.1] dark:bg-white/[0.1] mx-0.5" />
          <LogoMark />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <p className="px-2.5 pt-1 mb-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Workspace
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-120',
                isActive
                  ? 'bg-[#0E7490]/12 dark:bg-[#22D3EE]/15 text-[#0E7490] dark:text-[#22D3EE] font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={15}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className={clsx(
                    'shrink-0 transition-colors',
                    isActive ? 'text-[#0E7490] dark:text-[#22D3EE]' : 'text-slate-400 dark:text-slate-500 group-hover:text-current'
                  )}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User block + Logout (macOS Status Pod) */}
      <div className="p-3 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.04]">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-tint)] border border-[var(--border)] flex items-center justify-center shrink-0 shadow-xs">
            <span className="text-xs font-bold text-[#0E7490]">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--text)] truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
          </div>
        </div>

        {/* macOS Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40"
        >
          <LogOut size={13} strokeWidth={1.75} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}

