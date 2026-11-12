import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Printer } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useForm } from '../../hooks/useForm'
import { Button, Input, Alert, BrandMark } from '../../components/ui'
import OtpVerificationForm from '../../components/auth/OtpVerificationForm'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [apiError, setApiError] = useState('')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')

  const { values, errors, loading, setLoading, handleChange, setApiErrors } = useForm({
    email: '',
    password: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    setLoading(true)
    try {
      await login(values.email, values.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        const unverifiedEmail = err.response.data.email || values.email
        setPendingVerificationEmail(unverifiedEmail)
        toast.error('Email not verified. A verification code was sent to your Gmail.')
        return
      }
      const msg = err.response?.data?.message || 'Login failed. Please try again.'
      const errs = err.response?.data?.errors
      if (errs) setApiErrors(errs)
      else setApiError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (pendingVerificationEmail) {
    return (
      <OtpVerificationForm
        email={pendingVerificationEmail}
        onSuccess={() => {
          navigate('/dashboard')
        }}
        onBack={() => {
          setPendingVerificationEmail('')
        }}
      />
    )
  }

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <BrandMark size={32} className="mb-4 text-[#0E7490]" />
        <h1 className="font-display text-2xl font-bold text-[var(--text)] tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">Sign in to your SmartPrint account</p>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {apiError && <Alert type="error">{apiError}</Alert>}

            <Input
              label="Email address"
              type="email"
              name="email"
              value={values.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              required
            />

            <div className="space-y-1.5">
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={values.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-150"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Sign in
            </Button>
          </form>
        </div>
      </div>

      <p className="text-center text-sm text-[var(--text-muted)] mt-5">
        Don't have an account?{' '}
        <Link to="/register" className="text-[#0E7490] font-medium hover:text-[#155E75] transition-colors duration-150">
          Create one for free
        </Link>
      </p>
    </div>
  )
}
