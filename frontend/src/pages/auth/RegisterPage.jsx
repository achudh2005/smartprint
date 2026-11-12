import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Printer, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useForm } from '../../hooks/useForm'
import { Button, Input, Alert, BrandMark } from '../../components/ui'
import OtpVerificationForm from '../../components/auth/OtpVerificationForm'
import toast from 'react-hot-toast'

const requirements = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter',   test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter',   test: (p) => /[a-z]/.test(p) },
  { label: 'One number',             test: (p) => /[0-9]/.test(p) },
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [apiError, setApiError] = useState('')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')

  const { values, errors, loading, setLoading, handleChange, setApiErrors } = useForm({
    name: '', email: '', password: '', confirmPassword: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    setLoading(true)
    try {
      const result = await register(values.name, values.email, values.password, values.confirmPassword)
      if (result?.requiresVerification) {
        setPendingVerificationEmail(result.email || values.email)
        toast.success('Verification code sent to your email! Please check your Gmail inbox.')
        return
      }
      toast.success('Account created! Welcome to SmartPrint.')
      navigate('/shops/new')
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.'
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
          navigate('/shops/new')
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
        <h1 className="font-display text-2xl font-bold text-[var(--text)] tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">Start managing your print shop today</p>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {apiError && (
              <Alert type="error">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>{apiError}</span>
                  {apiError.toLowerCase().includes('already exists') && (
                    <Link to="/login" className="font-semibold underline text-[#0E7490] hover:text-[#155E75] shrink-0">
                      Sign in here &rarr;
                    </Link>
                  )}
                </div>
              </Alert>
            )}

            <Input
              label="Full name"
              type="text"
              name="name"
              value={values.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="John Smith"
              autoComplete="name"
              autoFocus
              required
            />

            <Input
              label="Email address"
              type="email"
              name="email"
              value={values.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
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
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  required
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-150"
                >
                  {showPass ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}

              {/* Password strength indicators */}
              {values.password && (
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {requirements.map((req) => {
                    const met = req.test(values.password)
                    return (
                      <div key={req.label} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600 dark:text-green-500' : 'text-[var(--text-muted)]'}`}>
                        <CheckCircle2 size={12} strokeWidth={2} className={met ? 'text-green-500' : 'text-[var(--border)]'} />
                        {req.label}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Input
              label="Confirm password"
              type={showPass ? 'text' : 'password'}
              name="confirmPassword"
              value={values.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
            />

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Create account
            </Button>
          </form>
        </div>
      </div>

      <p className="text-center text-sm text-[var(--text-muted)] mt-5">
        Already have an account?{' '}
        <Link to="/login" className="text-[#0E7490] font-medium hover:text-[#155E75] transition-colors duration-150">
          Sign in
        </Link>
      </p>
    </div>
  )
}
