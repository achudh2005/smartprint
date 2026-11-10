import { Link } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-[var(--accent-tint)] border border-[var(--border)] flex items-center justify-center mb-6">
        <Printer size={22} strokeWidth={1.75} className="text-[#0E7490]" />
      </div>
      <h1 className="text-4xl font-bold text-[var(--text)] mb-2 tracking-tight">404</h1>
      <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Page not found</h2>
      <p className="text-sm text-[var(--text-muted)] mb-8 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard">
        <Button variant="primary">Back to Dashboard</Button>
      </Link>
    </div>
  )
}
