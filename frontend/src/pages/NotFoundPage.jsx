import { Link } from 'react-router-dom'
import { Button } from '../components/ui'
import { NotFoundIllustration } from '../components/illustrations'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4 text-center page-enter">
      <div className="relative p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-raised)] max-w-md w-full motif-crop-marks">
        <div className="flex items-center justify-center mb-6">
          <NotFoundIllustration size={120} />
        </div>

        <span className="font-mono text-xs font-semibold text-[#0E7490] uppercase tracking-wider">
          Error 404 • Missing Target
        </span>

        <h1 className="font-display text-2xl font-bold text-[var(--text)] mt-2 mb-2 tracking-tight">
          Page Not Found
        </h1>

        <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed max-w-sm mx-auto">
          The requested coordinate or document route does not exist, has expired, or has been relocated to another workspace.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link to="/dashboard">
            <Button variant="primary" size="md">
              Return to Dashboard
            </Button>
          </Link>
          <Link to="/">
            <Button variant="secondary" size="md">
              Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
