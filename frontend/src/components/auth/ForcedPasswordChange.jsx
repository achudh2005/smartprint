import { useState } from 'react'
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { BrandMark, Button, Alert } from '../ui'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function ForcedPasswordChange() {
  const { updateUser } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('New password must contain at least one uppercase letter.')
      return
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('New password must contain at least one lowercase letter.')
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('New password must contain at least one number.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      })
      updateUser({ mustChangePassword: false })
      toast.success('Permanent password set successfully! Welcome aboard.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password. Please verify your current temporary password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden animate-scaleIn">
        {/* macOS Chrome Header */}
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-hover)] flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
          <span className="ml-2 text-xs font-medium text-[var(--text-muted)]">Security Setup &bull; First Login</span>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <Lock size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text)] tracking-tight">Set Permanent Password</h2>
              <p className="text-xs text-[var(--text-muted)]">Choose your new permanent account password to continue.</p>
            </div>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-xs">Current Temporary Password *</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  className="input pr-10 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label text-xs">New Permanent Password *</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters (A-Z, a-z, 0-9)"
                  className="input pr-10 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label text-xs">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="input text-xs"
              />
            </div>

            <div className="p-3 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)] text-[11px] text-[var(--text-muted)] space-y-1">
              <p className="font-semibold text-[var(--text)]">Password Requirements:</p>
              <p>&bull; Minimum 8 characters in length</p>
              <p>&bull; At least one uppercase and one lowercase letter</p>
              <p>&bull; At least one number (0-9)</p>
            </div>

            <Button type="submit" variant="primary" loading={loading} className="w-full">
              Update Password & Continue
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
