import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import {
  ShieldAlert,
  Store,
  Users,
  FileClock,
  LogOut,
  ChevronRight,
  LayoutDashboard,
  Info,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import ThemeToggle from '../ui/ThemeToggle'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Verify Super Admin access
  if (user && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface-50">
        <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <ShieldAlert className="text-rose-600 mx-auto mb-3" size={44} />
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6">
            You are logged in as <strong>{user.email}</strong> ({user.role}). Only Super Admin accounts have access to the platform control center.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800"
          >
            Return to Shop Dashboard
          </button>
        </div>
      </div>
    )
  }

  const navItems = [
    { to: '/admin', end: true, icon: LayoutDashboard, label: 'Platform Overview' },
    { to: '/admin/shops', icon: Store, label: 'Shop Moderation' },
    { to: '/admin/users', icon: Users, label: 'User Accounts' },
    { to: '/admin/audit-logs', icon: FileClock, label: 'Security Audit Logs' },
  ]

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white shrink-0 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-8 px-2">
            <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center font-bold text-white shadow-xs">
              SP
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight">SmartPrint</span>
              <span className="block text-[10px] text-amber-400 font-mono uppercase tracking-widest font-semibold">
                Super Admin
              </span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight size={14} className="opacity-60" />
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 mt-8">
          <div className="px-2 mb-3">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-surface-50 dark:bg-slate-950 transition-colors duration-200">
        <header className="h-16 px-6 md:px-10 flex items-center justify-between border-b border-surface-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Platform Super Administration
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/about"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 bg-surface-100 hover:bg-surface-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-surface-200 dark:border-slate-700 transition-all shadow-xs active:scale-95"
              title="About SmartPrint"
            >
              <Info size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />
              <span>About</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
