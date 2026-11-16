import { useNavigate } from 'react-router-dom'
import { ShieldAlert, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function ImpersonationBanner() {
  const { updateUser } = useAuth()
  const navigate = useNavigate()

  const isImpersonating = localStorage.getItem('impersonationActive') === 'true'
  if (!isImpersonating) return null

  let impersonatedData = null
  try {
    impersonatedData = JSON.parse(localStorage.getItem('impersonatedUser') || '{}')
  } catch (_) {}

  const handleExitImpersonation = () => {
    const origToken = localStorage.getItem('originalAdminAccessToken')
    const origRefresh = localStorage.getItem('originalAdminRefreshToken')
    const origUserJson = localStorage.getItem('originalAdminUser')

    if (origToken) {
      localStorage.setItem('accessToken', origToken)
    }
    if (origRefresh) {
      localStorage.setItem('refreshToken', origRefresh)
    }

    let origUser = null
    try {
      origUser = JSON.parse(origUserJson || '{}')
    } catch (_) {}

    localStorage.removeItem('impersonationActive')
    localStorage.removeItem('impersonatedUser')
    localStorage.removeItem('originalAdminAccessToken')
    localStorage.removeItem('originalAdminRefreshToken')
    localStorage.removeItem('originalAdminUser')

    if (origUser) {
      updateUser(origUser)
    }

    toast.success('Exited impersonation session. Returned to Super Admin Console.')
    navigate('/admin/users')
  }

  const displayName = impersonatedData?.name || impersonatedData?.email || 'Shop Owner'
  const shopName = impersonatedData?.shopUsers?.[0]?.shop?.name || ''

  return (
    <div className="bg-amber-500 text-black px-4 py-2 font-medium text-xs flex flex-wrap items-center justify-between gap-3 shadow-md sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} strokeWidth={2.5} className="shrink-0" />
        <span>
          <strong>SUPER ADMIN SESSION:</strong> Viewing platform as <strong>{displayName}</strong>
          {shopName ? ` (${shopName})` : ''} — All actions logged under your Super Admin audit trail.
        </span>
      </div>

      <button
        onClick={handleExitImpersonation}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
      >
        <LogOut size={12} strokeWidth={2.5} />
        <span>Exit Impersonation</span>
      </button>
    </div>
  )
}
