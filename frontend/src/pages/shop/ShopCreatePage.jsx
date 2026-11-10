import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store } from 'lucide-react'
import { useForm } from '../../hooks/useForm'
import { PageHeader, Card, CardBody, Button, Input, Textarea, Alert } from '../../components/ui'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function ShopCreatePage() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')

  const { values, errors, loading, setLoading, handleChange, setApiErrors } = useForm({
    name: '',
    address: '',
    phone: '',
    email: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    setLoading(true)
    try {
      const { data } = await api.post('/shops', values)
      toast.success(`Shop "${data.data.shop.name}" created!`)
      navigate(`/shops/${data.data.shop.id}/setup`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create shop.'
      const errs = err.response?.data?.errors
      if (errs) setApiErrors(errs)
      else setApiError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Create a New Shop"
        description="Set up your print shop in seconds. You can update details anytime."
      />

      <Card>
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-tint)] border border-[var(--border)] flex items-center justify-center shrink-0">
            <Store size={15} strokeWidth={1.75} className="text-[#0E7490]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Shop Details</h2>
            <p className="text-xs text-[var(--text-muted)]">These will be visible to customers</p>
          </div>
        </div>
        <CardBody className="p-5">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {apiError && <Alert type="error">{apiError}</Alert>}

            <Input
              label="Shop name *"
              type="text"
              name="name"
              value={values.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="e.g. Quick Print Center"
              required
              autoFocus
            />

            <Textarea
              label="Address"
              name="address"
              value={values.address}
              onChange={handleChange}
              error={errors.address}
              placeholder="123 Main Street, City, State"
              rows={3}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone number"
                type="tel"
                name="phone"
                value={values.phone}
                onChange={handleChange}
                error={errors.phone}
                placeholder="+91 98765 43210"
              />
              <Input
                label="Shop email"
                type="email"
                name="email"
                value={values.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="shop@example.com"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading}>
                Create Shop
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
