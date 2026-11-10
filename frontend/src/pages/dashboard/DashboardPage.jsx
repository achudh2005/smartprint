import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Store, Plus, Printer, ShoppingBag, Settings, AlertCircle, QrCode, DollarSign } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader, Card, CardBody, EmptyState, Badge, Button, Spinner, Alert } from '../../components/ui'
import api from '../../lib/api'

export default function DashboardPage() {
  const { user } = useAuth()
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/shops')
      .then(({ data }) => setShops(data.data.shops || []))
      .catch(() => setError('Failed to load your shops. Please refresh the page.'))
      .finally(() => setLoading(false))
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0]}`}
        description="Here's an overview of your SmartPrint workspace."
        action={
          <Link to="/shops/new">
            <Button variant="primary">
              <Plus size={15} strokeWidth={1.75} /> New Shop
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 text-red-600 py-4">
              <AlertCircle size={18} strokeWidth={1.75} className="shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </CardBody>
        </Card>
      ) : shops.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Store}
              title="No shops yet"
              description="Create your first print shop to get started managing orders, pricing and printers."
              action={
                <Link to="/shops/new">
                  <Button variant="primary">
                    <Plus size={15} strokeWidth={1.75} /> Create your first shop
                  </Button>
                </Link>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard icon={Store}       label="Total Shops"    value={shops.length} />
            <StatCard icon={ShoppingBag} label="Total Orders"   value={shops.reduce((a, s) => a + (s._count?.orders || 0), 0)} />
            <StatCard icon={Printer}     label="Total Printers" value={shops.reduce((a, s) => a + (s._count?.printers || 0), 0)} />
          </div>

          {/* Shop cards */}
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Your Shops</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center shrink-0">
          <Icon size={18} strokeWidth={1.75} className="text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text)] tabular-nums leading-tight">{value}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
        </div>
      </CardBody>
    </Card>
  )
}

function ShopCard({ shop }) {
  const statusVariant = shop.status === 'ACTIVE' ? 'green' : 'gray'
  return (
    <Card className="hover:shadow-card-hover transition-shadow duration-150">
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-tint)] border border-[var(--border)] flex items-center justify-center text-[#0E7490] font-bold text-base shrink-0">
            {shop.name[0].toUpperCase()}
          </div>
          <Badge variant={statusVariant} dot>{shop.status}</Badge>
        </div>

        <h3 className="text-sm font-semibold text-[var(--text)] truncate">{shop.name}</h3>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">{shop.shopCode}</p>
        {shop.address && (
          <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-2">{shop.address}</p>
        )}

        <div className="flex items-center gap-4 mt-4 text-xs text-[var(--text-muted)]">
          <span className="tabular-nums">{shop._count?.orders || 0} orders</span>
          <span className="tabular-nums">{shop._count?.printers || 0} printers</span>
          <Badge variant="blue" className="ml-auto">{shop.myRole}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[var(--border)]">
          <Link to={`/shops/${shop.id}/qr`} className="flex-1">
            <Button variant="primary" size="sm" className="w-full">
              <QrCode size={13} strokeWidth={1.75} /> QR Portal
            </Button>
          </Link>
          <Link to={`/shops/${shop.id}/orders`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              <ShoppingBag size={13} strokeWidth={1.75} /> Orders
            </Button>
          </Link>
          <Link to={`/shops/${shop.id}/pricing`} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full text-[var(--text-muted)]">
              <DollarSign size={13} strokeWidth={1.75} /> Pricing
            </Button>
          </Link>
          <Link to={`/shops/${shop.id}/settings`} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full text-[var(--text-muted)]">
              <Settings size={13} strokeWidth={1.75} /> Settings
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
