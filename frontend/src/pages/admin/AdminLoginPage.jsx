import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Lock, Eye, EyeOff, Server, Terminal, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const { updateUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/admin/auth/login', { email, password })
      const { user, accessToken, refreshToken } = res.data.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      updateUser(user)

      toast.success(`Authenticated as Super Administrator (${user.email})`)
      navigate('/admin')
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Authentication failed. Verify credentials and ensure the account has SUPER_ADMIN role.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col justify-between p-6 md:p-10 font-sans selection:bg-[#0E7490] selection:text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0E7490] flex items-center justify-center shadow-lg shadow-[#0E7490]/20">
            <Shield size={16} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white">SmartPrint</span>
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-widest">
              Master Console
            </span>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          <span>Shop Owner Portal</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* macOS Chrome Header */}
          <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>
            <span className="text-[11px] font-mono text-zinc-500 tracking-wider">
              auth.gateway.superadmin
            </span>
            <div className="w-6" />
          </div>

          <div className="p-7 space-y-6">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Super Admin Access</span>
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Enter platform administrator credentials to access root controls.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@smartprint.app"
                  className="w-full h-10 px-3.5 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490] font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-10 pl-3.5 pr-10 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-[11px] text-zinc-500 flex items-center gap-2">
                <Terminal size={14} className="text-[#22D3EE] shrink-0" />
                <span>Encrypted session with hardware telemetry & IP audit logging.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-[#0E7490] hover:bg-[#155E75] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#0E7490]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating root session...' : 'Sign In to Master Console'}
                {!loading && <ArrowRight size={14} />}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-600 gap-2">
        <p>SmartPrint Cloud Multi-Tenant Architecture &bull; Restricted Area</p>
        <p className="font-mono">Security Level: Maximum Root Control</p>
      </div>
    </div>
  )
}
