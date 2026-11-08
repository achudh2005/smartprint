import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Printer } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useForm } from '../../hooks/useForm'
import { Button, Input, Alert } from '../../components/ui'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [apiError, setApiError] = useState('')

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
      const msg = err.response?.data?.message || 'Login failed. Please try again.'
      const errs = err.response?.data?.errors
      if (errs) setApiErrors(errs)
      else setApiError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Logo + heading */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4">
          <Printer size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1.5 text-sm text-slate-500">Sign in to your SmartPrint account</p>
      </div>

      {/* Form card */}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
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

      <p className="text-center text-sm text-slate-500 mt-5">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
          Create one for free
        </Link>
      </p>
    </div>
  )
}
