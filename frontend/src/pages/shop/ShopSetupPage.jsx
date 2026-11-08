import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, Settings, ArrowRight, Store } from 'lucide-react'
import { PageHeader, Card, CardBody, Button, Badge, Spinner, Alert } from '../../components/ui'
import api from '../../lib/api'

const steps = [
  { id: 'details',  label: 'Shop Details',     description: 'Name, address and contact info', done: true },
  { id: 'settings', label: 'Configure Settings', description: 'Enable features and set limits', done: false },
  { id: 'pricing',  label: 'Set Pricing',       description: 'Configure pricing rules (Phase 2)', done: false, upcoming: true },
  { id: 'printers', label: 'Add Printers',      description: 'Connect print devices (Phase 2)', done: false, upcoming: true },
]

export default function ShopSetupPage() {
  const { shopId } = useParams()
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/shops/${shopId}`)
      .then(({ data }) => setShop(data.data.shop))
      .catch(() => setError('Failed to load shop.'))
      .finally(() => setLoading(false))
  }, [shopId])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (error) return <Alert type="error">{error}</Alert>

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Shop Setup"
        description="Complete these steps to get your shop ready."
      />

      {shop && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Shop Created!</p>
            <p className="text-xs text-green-700">
              <span className="font-mono">{shop.shopCode}</span> – {shop.name}
            </p>
          </div>
          <Badge variant="green" className="ml-auto">Active</Badge>
        </div>
      )}

      <div className="space-y-3">
        {steps.map((step, i) => (
          <Card key={step.id} className={step.upcoming ? 'opacity-60' : ''}>
            <CardBody className="flex items-center gap-4">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm
                ${step.done ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-slate-500'}`}>
                {step.done ? <CheckCircle2 size={18} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>
              {step.upcoming
                ? <span className="text-xs text-slate-400 font-medium">Phase 2</span>
                : step.done
                  ? <span className="text-xs text-green-600 font-medium">Done</span>
                  : (
                    <Link to={`/shops/${shopId}/settings`}>
                      <Button variant="secondary" size="sm">
                        Configure <ArrowRight size={13} />
                      </Button>
                    </Link>
                  )
              }
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <Link to="/dashboard">
          <Button variant="primary">Go to Dashboard <ArrowRight size={16} /></Button>
        </Link>
      </div>
    </div>
  )
}
