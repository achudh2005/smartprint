import { Outlet, Link } from 'react-router-dom'
import { Zap, Shield, Clock } from 'lucide-react'
import ThemeToggle from '../components/ui/ThemeToggle'
import { Wordmark } from '../components/ui'
import { DocumentStackIllustration } from '../components/illustrations'

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
        className="hidden lg:flex lg:flex-col lg:w-[420px] xl:w-[480px] shrink-0 relative overflow-hidden motif-crop-marks"
        style={{ background: '#0E7490' }}
      >
        {/* Subtle dot-grid pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none motif-dot-grid"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative flex flex-col h-full px-10 py-12 z-10">
          {/* Confident Wordmark Lockup */}
          <Link to="/" className="inline-flex items-center mb-10 group">
            <Wordmark size="lg" variant="white" showMark={true} />
          </Link>

          {/* Value props + Hero Illustration */}
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div>
              <h2 className="font-display text-3xl font-semibold text-white leading-snug tracking-tight">
                Cloud print management
                <br />
                built for speed.
              </h2>
              <p className="text-xs uppercase tracking-widest text-cyan-200 font-semibold mt-2">
                Enterprise Autonomous Infrastructure
              </p>
            </div>

            {/* Hand-authored SVG Document Stack */}
            <div className="py-2 flex items-center justify-center">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <DocumentStackIllustration size={150} className="text-white/90" />
              </div>
            </div>

            <ul className="space-y-4">
              {valueProps.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3.5">
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-cyan-100 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer note */}
          <p className="text-xs text-cyan-200 mt-8">
            © {new Date().getFullYear()} SmartPrint. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col flex-1 min-h-screen lg:min-h-0 bg-[var(--bg)]">
        {/* Top bar on mobile / theme toggle on all sizes */}
        <header className="flex items-center justify-between px-6 py-5 lg:justify-end border-b border-[var(--border)] lg:border-none">
          {/* Mobile logo — hidden on desktop */}
          <Link to="/" className="inline-flex items-center lg:hidden">
            <Wordmark size="sm" showMark={true} />
          </Link>

          <ThemeToggle />
        </header>

        {/* Centered form */}
        <main className="flex-1 flex items-center justify-center px-4 py-10 page-enter">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </main>

        <footer className="py-5 text-center text-xs text-[var(--text-muted)] lg:hidden border-t border-[var(--border)]">
          © {new Date().getFullYear()} SmartPrint. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
