import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { PageHeader, Card, CardBody, Button, Badge, Spinner, Alert } from '../../components/ui'
import api from '../../lib/api'

const steps = [
  { id: 'details',  label: 'Shop Details',     description: 'Name, address and contact info', done: true },
  { id: 'settings', label: 'Configure Settings', description: 'Enable features and set limits', done: false },
  { id: 'pricing',  label: 'Set Pricing',       description: 'Configure pricing rules', done: false, upcoming: true },
  { id: 'printers', label: 'Add Printers',      description: 'Connect print devices', done: false, upcoming: true },
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
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Shop Setup"
        description="Complete these steps to get your shop ready."
      />

      {shop && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={18} strokeWidth={1.75} className="text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Shop Created!</p>
            <p className="text-xs text-green-700 dark:text-green-400">
              <span className="font-mono font-medium">{shop.shopCode}</span> – {shop.name}
            </p>
          </div>
          <Badge variant="green" size="sm" dot className="ml-auto">Active</Badge>
        </div>
      )}

      <div className="space-y-3">
        {steps.map((step, i) => (
          <Card key={step.id} className={step.upcoming ? 'opacity-60' : ''}>
            <CardBody className="p-4 flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-semibold text-xs
                ${step.done ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]'}`}>
                {step.done ? <CheckCircle2 size={16} strokeWidth={2} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text)]">{step.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{step.description}</p>
              </div>
              {step.upcoming
                ? <span className="text-xs text-[var(--text-muted)] font-medium">Coming soon</span>
                : step.done
                  ? <span className="text-xs text-green-600 dark:text-green-400 font-medium">Done</span>
                  : (
                    <Link to={`/shops/${shopId}/settings`}>
                      <Button variant="secondary" size="sm">
                        Configure <ArrowRight size={13} strokeWidth={1.75} />
                      </Button>
                    </Link>
                  )
              }
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="pt-2">
        <Link to="/dashboard">
          <Button variant="primary">
            Go to Dashboard <ArrowRight size={15} strokeWidth={1.75} />
          </Button>
        </Link>
      </div>
    </div>
  )
}
