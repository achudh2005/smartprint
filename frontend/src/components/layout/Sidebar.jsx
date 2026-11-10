import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  Printer, LayoutDashboard, Store, Settings,
  User, LogOut, X, Info
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import clsx from 'clsx'

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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-60 bg-[var(--surface)] border-r border-[var(--border)] h-full shrink-0 transition-colors duration-150">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-64 bg-[var(--surface)] border-r border-[var(--border)] transform transition-transform duration-150 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <LogoMark />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
            aria-label="Close sidebar"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <SidebarContent user={user} onLogout={handleLogout} hideLogo />
      </aside>
    </>
  )
}

function LogoMark() {
  return (
    <Link to="/dashboard" className="inline-flex items-center gap-2.5">
      <div className="w-7 h-7 bg-[#0E7490] rounded-lg flex items-center justify-center shrink-0">
        <Printer size={14} className="text-white" strokeWidth={1.75} />
      </div>
      <span className="text-base font-bold text-[var(--text)] tracking-tight">SmartPrint</span>
    </Link>
  )
}

function SidebarContent({ user, onLogout, hideLogo }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      {!hideLogo && (
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <LogoMark />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-3 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
          Navigation
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-[var(--accent-tint)] text-[#0E7490] dark:text-[#22D3EE]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Accent indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#0E7490] rounded-r" />
                )}
                <Icon size={16} strokeWidth={1.75} className={clsx('shrink-0', isActive ? 'text-[#0E7490] dark:text-[#22D3EE]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]')} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User block + Logout */}
      <div className="px-3 py-4 border-t border-[var(--border)] space-y-1">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          <div className="w-7 h-7 rounded-full bg-[var(--accent-tint)] border border-[var(--border)] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#0E7490]">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--text)] truncate">{user?.name}</p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">{user?.email}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150"
        >
          <LogOut size={16} strokeWidth={1.75} className="shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}
