import { Outlet, Link } from 'react-router-dom'
import { Printer, Zap, Shield, Clock } from 'lucide-react'
import ThemeToggle from '../components/ui/ThemeToggle'

const valueProps = [
  {
    icon: Zap,
    title: 'Instant QR ordering',
    desc: 'Customers scan, upload, and pay — no app needed.',
  },
  {
    icon: Shield,
    title: 'Secure & reliable',
    desc: 'End-to-end encrypted uploads, real-time order tracking.',
  },
  {
    icon: Clock,
    title: 'Zero wait time',
    desc: 'Print agents ping your hardware the moment a job arrives.',
  },
]

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">

      {/* ── Left brand panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:flex-col lg:w-[420px] xl:w-[480px] shrink-0 relative overflow-hidden"
        style={{ background: '#0E7490' }}
      >
        {/* Subtle dot-grid pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative flex flex-col h-full px-10 py-12">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <Printer size={18} className="text-white" strokeWidth={1.75} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">SmartPrint</span>
          </Link>

          {/* Value props */}
          <div className="flex-1 flex flex-col justify-center space-y-8">
            <h2 className="text-3xl font-semibold text-white leading-snug">
              Cloud print management
              <br />
              built for speed.
            </h2>

            <ul className="space-y-6 mt-2">
              {valueProps.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-4">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-sm text-cyan-100 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer note */}
          <p className="text-xs text-cyan-200 mt-12">
            © {new Date().getFullYear()} SmartPrint. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col flex-1 min-h-screen lg:min-h-0 bg-[var(--bg)]">
        {/* Top bar on mobile / theme toggle on all sizes */}
        <header className="flex items-center justify-between px-6 py-5 lg:justify-end">
          {/* Mobile logo — hidden on desktop */}
          <Link to="/" className="inline-flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 bg-[#0E7490] rounded-lg flex items-center justify-center shrink-0">
              <Printer size={14} className="text-white" strokeWidth={1.75} />
            </div>
            <span className="text-base font-bold text-[var(--text)] tracking-tight">SmartPrint</span>
          </Link>

          <ThemeToggle />
        </header>

        {/* Centered form */}
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </main>

        <footer className="py-5 text-center text-xs text-[var(--text-muted)] lg:hidden">
          © {new Date().getFullYear()} SmartPrint. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
