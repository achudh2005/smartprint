import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  ShieldAlert,
  Store,
  Users,
  FileClock,
  LogOut,
  LayoutDashboard,
  Printer,
  ShoppingBag,
  CreditCard,
  Cpu,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import ThemeToggle from '../ui/ThemeToggle'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  // Verify Super Admin access
  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#09090B] text-zinc-100">
        <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert size={24} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Super Admin Restricted</h2>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              {user
                ? `You are logged in as ${user.email} (${user.role}). This master control website is restricted to Super Administrator accounts.`
                : 'Authentication required. Please sign in to the Super Admin Master Console.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={() => navigate('/admin/login')}
              className="flex-1 py-2 px-3 bg-[#0E7490] hover:bg-[#155E75] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Sign In to Super Admin
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="py-2 px-3 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
            >
              Shop Portal
            </button>
          </div>
        </div>
      </div>
    )
  }

  const navItems = [
    { to: '/admin', end: true, icon: LayoutDashboard, label: 'Platform Overview' },
    { to: '/admin/users', icon: Users, label: 'User Accounts' },
    { to: '/admin/shops', icon: Store, label: 'Shop Management' },
    { to: '/admin/orders', icon: ShoppingBag, label: 'Master Orders' },
    { to: '/admin/printers', icon: Printer, label: 'Printers & Terminals' },
    { to: '/admin/payments', icon: CreditCard, label: 'Payments Ledger' },
    { to: '/admin/audit-logs', icon: FileClock, label: 'Security Audit Logs' },
    { to: '/admin/system', icon: Cpu, label: 'System Diagnostics' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col md:flex-row font-sans">
      {/* ── Super Admin Master Sidebar ── */}
      <aside
        className="w-full md:w-64 shrink-0 flex flex-col"
        style={{ background: '#09090B', borderRight: '1px solid #27272A' }}
      >
        {/* Logo & Platform Badge */}
        <div className="px-5 py-5 border-b" style={{ borderColor: '#27272A' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0E7490] flex items-center justify-center shrink-0 shadow-md shadow-[#0E7490]/20">
                <Printer size={15} className="text-white" strokeWidth={2} />
              </div>
              <div className="leading-tight">
                <span className="block text-sm font-bold text-white tracking-tight">SmartPrint</span>
                <span className="block text-[10px] text-amber-400 font-semibold uppercase tracking-widest">
                  Master Console
                </span>
              </div>
            </div>

            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Platform Operations
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0E7490]/20 text-[#22D3EE] font-semibold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#0E7490] rounded-r-md" />
                  )}
                  <item.icon size={15} strokeWidth={1.8} className="shrink-0" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info & Switcher */}
        <div className="px-3 py-3 border-t space-y-2" style={{ borderColor: '#27272A' }}>
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#0E7490]/25 text-[#22D3EE] flex items-center justify-center text-[10px] font-bold">
                ROOT
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">{user?.name || 'Super Admin'}</p>
                <p className="text-[9px] text-zinc-500 truncate font-mono">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <a
              href="/dashboard"
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 transition-colors"
            >
              <span>Shop App</span>
              <ArrowUpRight size={12} />
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={13} strokeWidth={1.75} />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--bg)] transition-colors duration-150">
        {/* Header */}
        <header className="h-14 px-6 md:px-8 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--text)] tracking-tight">
              SmartPrint Central Command Console
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-mono bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)]">
              Environment: AWS EC2 Production
            </span>
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
