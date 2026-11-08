import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ShoppingBag, FileText, IndianRupee, Clock, CheckCircle2,
  XCircle, TrendingUp, QrCode, ArrowRight, RefreshCw, AlertCircle,
  Radio, Printer
} from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, Button, Spinner, Badge } from '../../components/ui'
import ShopNavTabs from '../../components/shop/ShopNavTabs'
import api from '../../lib/api'
import { connectShopSocket, disconnectShopSocket } from '../../lib/socket'
import toast from 'react-hot-toast'

export default function ShopDashboardPage() {
  const { shopId } = useParams()
  const [shop, setShop] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [socketOnline, setSocketOnline] = useState(false)

  const fetchStats = async () => {
    try {
      const [shopRes, statsRes] = await Promise.all([
        api.get(`/shops/${shopId}`),
        api.get(`/shops/${shopId}/dashboard/stats`),
      ])
      setShop(shopRes.data.data.shop)
      setStats(statsRes.data.data)
    } catch (err) {
      toast.error('Failed to load shop dashboard statistics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    // Real-Time Socket Connection
    const socket = connectShopSocket(
      shopId,
      (newOrder) => {
        toast.custom((t) => (
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-top-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center font-bold text-xs">
              NEW
            </div>
            <div>
              <p className="font-bold text-xs">New Print Order #{newOrder.orderNumber}</p>
              <p className="text-[11px] text-slate-400">
                {newOrder.filesCount} file(s) • ₹{newOrder.totalAmount}
              </p>
            </div>
          </div>
        ), { duration: 6000 })

        // Refresh stats immediately
        fetchStats()
      },
      () => {
        fetchStats()
      }
    )

    socket.on('connect', () => setSocketOnline(true))
    socket.on('disconnect', () => setSocketOnline(false))
    if (socket.connected) setSocketOnline(true)

    return () => {
      disconnectShopSocket(shopId)
    }
  }, [shopId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${shop?.name || 'Shop'} Dashboard`}
        description="Real-time order tracking, production metrics, and daily trends."
        action={
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              socketOnline ? 'bg-green-100 text-green-700' : 'bg-surface-200 text-slate-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${socketOnline ? 'bg-green-500 animate-ping' : 'bg-slate-400'}`} />
              <span>{socketOnline ? 'Live Socket Connected' : 'Connecting...'}</span>
            </div>

            <Button variant="secondary" size="sm" onClick={fetchStats}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        }
      />

      <ShopNavTabs shopId={shopId} />

      {/* ── Summary Stats Cards (Real DB data) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <StatCard
          icon={ShoppingBag}
          label="Today's Orders"
          value={stats?.todayOrders || 0}
          color="blue"
        />
        <StatCard
          icon={FileText}
          label="Total Pages Today"
          value={stats?.totalPagesToday || 0}
          color="indigo"
        />
        <StatCard
          icon={IndianRupee}
          label="Today's Revenue"
          value={`₹${Number(stats?.todayRevenue || 0).toFixed(2)}`}
          color="emerald"
        />
        <StatCard
          icon={Clock}
          label="Pending Orders"
          value={stats?.pendingOrders || 0}
          color="amber"
          pulse={stats?.pendingOrders > 0}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats?.completedOrders || 0}
          color="green"
        />
        <StatCard
          icon={XCircle}
          label="Cancelled"
          value={stats?.cancelledOrders || 0}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 7-Day Trend Visualizer ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary-600" />
                <h3 className="font-semibold text-slate-800 text-sm">7-Day Order & Revenue Trends</h3>
              </div>
              <span className="text-xs text-slate-400">Database figures</span>
            </div>
          </CardHeader>
          <CardBody className="p-5">
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 items-end h-40 pt-4 pb-2">
                {stats?.dailyTrends?.map((day) => {
                  const maxOrders = Math.max(...(stats?.dailyTrends?.map((d) => d.orders) || [1]), 1)
                  const heightPercent = Math.max(10, Math.round((day.orders / maxOrders) * 100))

                  return (
                    <div key={day.date} className="flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] text-slate-500 font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {day.orders}
                      </div>
                      <div
                        className="w-full max-w-[36px] bg-primary-500 hover:bg-primary-600 rounded-t-lg transition-all"
                        style={{ height: `${heightPercent}%` }}
                        title={`${day.label}: ${day.orders} orders (₹${day.revenue})`}
                      />
                      <span className="text-[10px] text-slate-400 font-medium mt-2 truncate w-full text-center">
                        {day.label.split(' ')[0]}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Legend & Summary */}
              <div className="pt-3 border-t border-surface-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-primary-500 rounded" />
                    <span>Daily Volume</span>
                  </div>
                </div>
                <span>Hover bar to view day metrics</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── Order Status Summary ── */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800 text-sm">Status Pipeline Breakdown</h3>
          </CardHeader>
          <CardBody className="space-y-3.5 p-5">
            {[
              { label: 'New / Confirmed', count: (stats?.statusBreakdown?.CONFIRMED || 0) + (stats?.statusBreakdown?.PENDING || 0), color: 'bg-blue-500' },
              { label: 'Printing (In Queue)', count: (stats?.statusBreakdown?.PRINTING || 0) + (stats?.statusBreakdown?.PROCESSING || 0), color: 'bg-amber-500' },
              { label: 'Printed (Ready for Pickup)', count: (stats?.statusBreakdown?.PRINTED || 0) + (stats?.statusBreakdown?.READY || 0), color: 'bg-indigo-500' },
              { label: 'Collected / Finished', count: (stats?.statusBreakdown?.COLLECTED || 0) + (stats?.statusBreakdown?.COMPLETED || 0), color: 'bg-green-500' },
              { label: 'Rejected / Cancelled', count: (stats?.statusBreakdown?.REJECTED || 0) + (stats?.statusBreakdown?.CANCELLED || 0), color: 'bg-rose-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-bold text-slate-900">{item.count}</span>
                </div>
                <div className="w-full bg-surface-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`${item.color} h-full rounded-full transition-all`}
                    style={{ width: `${Math.min(100, item.count * 10)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* ── Recent Live Orders Feed ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-primary-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Recent Incoming Orders</h3>
            </div>
            <Link to={`/shops/${shopId}/orders`} className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-semibold">
              View All Orders <ArrowRight size={13} />
            </Link>
          </div>
        </CardHeader>
        <CardBody className="p-0 divide-y divide-surface-100">
          {stats?.recentOrders?.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No orders received yet today.
            </div>
          ) : (
            stats?.recentOrders?.map((ord) => (
              <div key={ord.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-surface-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-primary-600 font-bold shrink-0">
                    <FileText size={15} />
                  </div>
                  <div>
                    <Link to={`/shops/${shopId}/orders/${ord.id}`} className="font-mono font-bold text-slate-900 hover:text-primary-600 text-xs">
                      {ord.orderNumber}
                    </Link>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {ord.filesCount} file(s) • {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-900 text-sm">
                    ₹{Number(ord.totalAmount || 0).toFixed(2)}
                  </span>
                  <Badge variant={getStatusVariant(ord.status)} size="sm">
                    {ord.status}
                  </Badge>
                  <Link to={`/shops/${shopId}/orders/${ord.id}`}>
                    <Button variant="secondary" size="sm">
                      Manage
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = 'blue', pulse = false }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    rose: 'bg-rose-50 text-rose-600',
  }

  return (
    <Card className="shadow-xs hover:shadow-card-hover transition-all">
      <CardBody className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
            <Icon size={16} />
          </div>
          {pulse && (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          )}
        </div>
        <div>
          <span className="text-xl font-bold text-slate-900 block tracking-tight">{value}</span>
          <span className="text-[11px] text-slate-400 font-medium block truncate">{label}</span>
        </div>
      </CardBody>
    </Card>
  )
}

function getStatusVariant(status) {
  switch (status) {
    case 'PENDING':
    case 'CONFIRMED':
    case 'PAYMENT_PENDING':
    case 'ACCEPTED':
      return 'blue'
    case 'PRINTING':
    case 'PROCESSING':
      return 'amber'
    case 'PRINTED':
    case 'READY':
    case 'COLLECTED':
    case 'COMPLETED':
      return 'green'
    case 'REJECTED':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'red'
    default:
      return 'gray'
  }
}
