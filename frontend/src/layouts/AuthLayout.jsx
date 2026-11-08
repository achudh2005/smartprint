import { Outlet, Link } from 'react-router-dom'
import { Printer, Info } from 'lucide-react'
import ThemeToggle from '../components/ui/ThemeToggle'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-surface-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Printer className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">SmartPrint</span>
        </Link>
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

      {/* Page content */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        © {new Date().getFullYear()} SmartPrint. All rights reserved.
      </footer>
    </div>
  )
}
