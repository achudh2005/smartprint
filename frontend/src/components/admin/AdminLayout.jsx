import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
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
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import ThemeToggle from '../ui/ThemeToggle'
import MacTrafficLights from '../ui/MacTrafficLights'
import { BrandMark } from '../ui/BrandMark'
import clsx from 'clsx'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  // Verify Super Admin access
  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] text-[var(--text)]">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 max-w-md w-full text-center shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
            <ShieldAlert size={24} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text)] tracking-tight">Super Admin Restricted</h2>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              {user
                ? `You are logged in as ${user.email} (${user.role}). This master control console is restricted to Super Administrator accounts.`
                : 'Authentication required. Please sign in to the Super Admin Master Console.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={() => navigate('/admin/login')}
              className="btn btn-primary btn-md flex-1 text-xs"
            >
              Sign In to Super Admin
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary btn-md text-xs"
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

  const SidebarContent = ({ onNavClick }) => (
    <div className="flex flex-col h-full">
      {/* Title Bar Chrome */}
      <div className="h-14 px-4.5 flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] shrink-0">
        <div className="flex items-center gap-3">
          <MacTrafficLights size="sm" />
          <div className="h-3.5 w-px bg-black/[0.1] dark:bg-white/[0.1] mx-0.5" />
          <Link to="/admin" className="flex items-center gap-2">
            <BrandMark size={20} />
            <div className="leading-tight">
              <span className="text-xs font-bold text-[var(--text)] tracking-tight block">SmartPrint</span>
              <span className="text-[9px] font-bold text-[#007AFF] dark:text-[#0A84FF] uppercase tracking-wider block">
                Master Console
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <p className="px-2.5 pt-1 mb-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          Super Admin Operations
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavClick}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-120',
                isActive
                  ? 'bg-[#007AFF]/12 dark:bg-[#0A84FF]/20 text-[#007AFF] dark:text-[#0A84FF] font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              )
            }
          >
            <item.icon size={15} strokeWidth={1.8} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Admin User Card & Links */}
      <div className="p-3 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2 shrink-0">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
          <div className="w-7 h-7 rounded-lg bg-[#007AFF]/15 text-[#007AFF] dark:text-[#0A84FF] flex items-center justify-center text-[10px] font-bold shrink-0">
            ROOT
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--text)] truncate">{user?.name || 'Super Admin'}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate font-mono">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <Link
            to="/dashboard"
            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] transition-colors"
          >
            <span>Shop App</span>
            <ArrowUpRight size={12} />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={13} strokeWidth={1.75} />
            <span>Exit</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] transition-colors duration-150">
      {/* ── Desktop macOS Sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col w-64 mac-vibrancy-sidebar h-full shrink-0 border-r border-black/[0.08] dark:border-white/[0.08] select-none">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-xl border-r border-black/[0.08] dark:border-white/[0.08] shadow-2xl transition-transform duration-200 ease-in-out lg:hidden flex flex-col',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/[0.08] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <MacTrafficLights size="sm" onClose={() => setMobileMenuOpen(false)} />
            <span className="text-xs font-bold text-[var(--text)] ml-1">Super Admin Console</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMobileMenuOpen(false);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMobileMenuOpen(false);
            }}
            className="w-10 h-10 -mr-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:scale-95 flex items-center justify-center transition-all cursor-pointer touch-manipulation"
            aria-label="Close sidebar"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>
        <SidebarContent onNavClick={() => setMobileMenuOpen(false)} />
      </aside>

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity duration-200 cursor-pointer touch-manipulation"
          onClick={() => setMobileMenuOpen(false)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setMobileMenuOpen(false);
          }}
        />
      )}

      {/* ── Main Content Area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 mac-vibrancy-header flex items-center px-4 sm:px-6 gap-3 shrink-0 transition-colors duration-150 sticky top-0 z-20">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#007AFF]/12 dark:bg-[#0A84FF]/20 text-[#007AFF] dark:text-[#0A84FF] border border-[#007AFF]/25 shadow-xs">
              <ShieldCheck size={12} strokeWidth={2.2} />
              <span>SUPER ADMIN</span>
            </span>
            <span className="hidden sm:inline-block text-xs font-semibold text-[var(--text-muted)]">
              Central Command Console
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Production Node
            </span>

            <ThemeToggle />

            <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />

            <div className="flex items-center gap-2 px-2 py-1 rounded-lg">
              <div className="w-6 h-6 rounded-md bg-[#007AFF]/15 border border-[#007AFF]/25 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-[#007AFF] dark:text-[#0A84FF]">
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <span className="hidden sm:block text-xs font-semibold text-[var(--text)] leading-none truncate max-w-[120px]">
                {user?.name || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
