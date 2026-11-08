import { Link } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-6">
        <Printer size={30} className="text-primary-600" />
      </div>
      <h1 className="text-5xl font-bold text-slate-900 mb-3">404</h1>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">Page not found</h2>
      <p className="text-slate-500 mb-8 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard">
        <Button variant="primary">Back to Dashboard</Button>
      </Link>
    </div>
  )
}
