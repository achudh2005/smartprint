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
          'fixed inset-y-0 left-0 z-50 w-64 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-xl border-r border-black/[0.08] dark:border-white/[0.08] shadow-2xl transition-transform duration-200 ease-in-out lg:hidden flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/[0.08] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <MacTrafficLights size="sm" onClose={onClose} />
            <LogoMark />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <SidebarContent user={user} onLogout={handleLogout} hideLogo onNavClick={onClose} />
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

function SidebarContent({ user, onLogout, hideLogo, onNavClick }) {
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
            onClick={onNavClick}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-120',
                isActive
                  ? 'bg-[#007AFF]/12 dark:bg-[#0A84FF]/20 text-[#007AFF] dark:text-[#0A84FF] font-semibold shadow-xs'
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
                    isActive ? 'text-[#007AFF] dark:text-[#0A84FF]' : 'text-slate-400 dark:text-slate-500 group-hover:text-current'
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
            <span className="text-xs font-bold text-[#007AFF] dark:text-[#0A84FF]">
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

