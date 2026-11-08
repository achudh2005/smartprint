import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Store, Plus, Printer, ShoppingBag, Settings, ChevronRight, AlertCircle, QrCode, DollarSign } from 'lucide-react'
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
        title={`${greeting()}, ${user?.name?.split(' ')[0]} 👋`}
        description="Here's an overview of your SmartPrint workspace."
        action={
          <Link to="/shops/new">
            <Button variant="primary">
              <Plus size={16} /> New Shop
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
              <AlertCircle size={20} className="shrink-0" />
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
                    <Plus size={16} /> Create your first shop
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
            <StatCard icon={Store}       label="Total Shops"   value={shops.length} color="blue" />
            <StatCard icon={ShoppingBag} label="Total Orders"  value={shops.reduce((a, s) => a + (s._count?.orders || 0), 0)} color="green" />
            <StatCard icon={Printer}     label="Total Printers" value={shops.reduce((a, s) => a + (s._count?.printers || 0), 0)} color="purple" />
          </div>

          {/* Shop cards */}
          <h2 className="text-base font-semibold text-slate-700 mb-3">Your Shops</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  )
}

function ShopCard({ shop }) {
  const statusVariant = shop.status === 'ACTIVE' ? 'green' : 'gray'
  return (
    <Card className="hover:shadow-card-hover transition-shadow">
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg shrink-0">
            {shop.name[0].toUpperCase()}
          </div>
          <Badge variant={statusVariant}>{shop.status}</Badge>
        </div>

        <h3 className="font-semibold text-slate-900 truncate">{shop.name}</h3>
        <p className="text-xs text-slate-400 mt-0.5 font-mono">{shop.shopCode}</p>
        {shop.address && (
          <p className="text-xs text-slate-500 mt-2 line-clamp-2">{shop.address}</p>
        )}

        <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
          <span>{shop._count?.orders || 0} orders</span>
          <span>{shop._count?.printers || 0} printers</span>
          <Badge variant="blue" className="ml-auto">{shop.myRole}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-surface-100">
          <Link to={`/shops/${shop.id}/qr`} className="flex-1">
            <Button variant="primary" size="sm" className="w-full">
              <QrCode size={13} /> QR Portal
            </Button>
          </Link>
          <Link to={`/shops/${shop.id}/orders`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              <ShoppingBag size={13} /> Orders
            </Button>
          </Link>
          <Link to={`/shops/${shop.id}/pricing`} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full text-slate-600">
              <DollarSign size={13} /> Pricing
            </Button>
          </Link>
          <Link to={`/shops/${shop.id}/settings`} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full text-slate-600">
              <Settings size={13} /> Settings
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
