import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { BrandMark, Button } from '../../components/ui'

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-8">
        <BrandMark size={32} className="mb-4 text-[#0E7490]" />
        <h1 className="font-display text-2xl font-bold text-[var(--text)] tracking-tight">Access Restricted</h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">Shop owner accounts are managed centrally</p>
      </div>

      <div className="card">
        <div className="card-body text-center py-8 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
            <ShieldAlert size={24} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Registration by Administrator Only</h2>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed max-w-sm mx-auto">
              Public self-registration is closed. New shop owner accounts must be provisioned by a SmartPrint Super Administrator.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/login">
              <Button variant="primary" className="w-full">
                <ArrowLeft size={16} strokeWidth={1.75} className="mr-2" />
                Return to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-[var(--text-muted)] mt-5">
        Need access? Contact your platform administrator or support.
      </p>
    </div>
  )
}
