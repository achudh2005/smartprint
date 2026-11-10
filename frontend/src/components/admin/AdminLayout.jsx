import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  ShieldAlert,
  Store,
  Users,
  FileClock,
  LogOut,
  LayoutDashboard,
  Printer,
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
        <div className="bg-[var(--surface)] border border-red-200 dark:border-red-900/60 rounded-xl p-8 max-w-md w-full text-center shadow-card">
          <ShieldAlert className="text-red-600 mx-auto mb-4" size={36} strokeWidth={1.75} />
          <h2 className="text-base font-semibold text-[var(--text)]">Access Restricted</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">
            You are logged in as <strong>{user.email}</strong> ({user.role}). Only Super Admin accounts have access to the platform control center.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
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
    <div className="min-h-screen bg-[var(--bg)] flex flex-col md:flex-row">
      {/* ── Admin Sidebar ── */}
      <aside
        className="w-full md:w-60 shrink-0 flex flex-col"
        style={{ background: '#09090B', borderRight: '1px solid #27272A' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: '#27272A' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0E7490] flex items-center justify-center shrink-0">
              <Printer size={14} className="text-white" strokeWidth={1.75} />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-bold text-white tracking-tight">SmartPrint</span>
              <span className="block text-[10px] text-amber-400 font-semibold uppercase tracking-widest">
                Super Admin
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="px-3 mb-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
            Administration
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#0E7490]/20 text-[#22D3EE]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#0E7490] rounded-r" />
                  )}
                  <item.icon size={16} strokeWidth={1.75} className="shrink-0" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: '#27272A' }}>
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-[#0E7490]/20 border border-[#0E7490]/30 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-[#22D3EE]">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150"
          >
            <LogOut size={16} strokeWidth={1.75} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--bg)] transition-colors duration-150">
        {/* Header */}
        <header className="h-14 px-6 md:px-8 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
          <div className="text-xs font-semibold text-[var(--text-muted)] tracking-wide">
            Platform Administration
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
