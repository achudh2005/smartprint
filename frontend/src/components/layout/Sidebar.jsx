import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  Printer, LayoutDashboard, Store, Settings,
  User, LogOut, X, ChevronRight, Info
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
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white dark:bg-slate-900 border-r border-surface-200 dark:border-slate-800 h-full transition-colors duration-200">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-slate-900 border-r border-surface-200 dark:border-slate-800 transform transition-transform duration-200 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-100 dark:border-slate-800">
          <LogoMark />
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-surface-100 dark:hover:bg-slate-800">
            <X size={18} />
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
      <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
        <Printer size={16} className="text-white" />
      </div>
      <span className="text-lg font-bold text-slate-900 dark:text-white">SmartPrint</span>
    </Link>
  )
}

function SidebarContent({ user, onLogout, hideLogo }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      {!hideLogo && (
        <div className="p-5 border-b border-surface-100 dark:border-slate-800">
          <LogoMark />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Menu</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && 'sidebar-link-active')
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-surface-100 dark:border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="sidebar-link w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700"
        >
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}
