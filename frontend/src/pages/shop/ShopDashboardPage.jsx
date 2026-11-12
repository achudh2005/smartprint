import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ShoppingBag, FileText, IndianRupee, Clock, CheckCircle2,
  XCircle, TrendingUp, ArrowRight, RefreshCw, Radio
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
          <div className="bg-[#09090B] text-white p-4 rounded-xl shadow-card flex items-center gap-3 border border-[#27272A]">
            <div className="w-7 h-7 rounded-lg bg-[#0E7490] flex items-center justify-center font-bold text-[10px] text-white shrink-0">
              NEW
            </div>
            <div>
              <p className="font-semibold text-xs">New Print Order #{newOrder.orderNumber}</p>
              <p className="text-[11px] text-zinc-400">
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
            {/* Live socket indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
              socketOnline
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                : 'bg-[var(--surface-hover)] text-[var(--text-muted)] border-[var(--border)]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${socketOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'}`} />
              <span>{socketOnline ? 'Live' : 'Connecting...'}</span>
            </div>

            <Button variant="secondary" size="sm" onClick={fetchStats}>
              <RefreshCw size={14} strokeWidth={1.75} /> Refresh
            </Button>
          </div>
        }
      />

      <ShopNavTabs shopId={shopId} />

      {/* ── Summary Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <DashStatCard icon={ShoppingBag}  label="Today's Orders"    value={stats?.todayOrders || 0} />
        <DashStatCard icon={FileText}     label="Pages Today"       value={stats?.totalPagesToday || 0} />
        <DashStatCard icon={IndianRupee}  label="Today's Revenue"   value={`₹${Number(stats?.todayRevenue || 0).toFixed(2)}`} money />
        <DashStatCard icon={Clock}        label="Pending"           value={stats?.pendingOrders || 0} pulse={stats?.pendingOrders > 0} />
        <DashStatCard icon={CheckCircle2} label="Completed"         value={stats?.completedOrders || 0} />
        <DashStatCard icon={XCircle}      label="Cancelled"         value={stats?.cancelledOrders || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── 7-Day Trend Chart ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} strokeWidth={1.75} className="text-[#0E7490]" />
                <h3 className="text-sm font-semibold text-[var(--text)]">7-Day Order & Revenue Trends</h3>
              </div>
              <span className="text-xs text-[var(--text-muted)]">Database figures</span>
            </div>
          </CardHeader>
          <CardBody className="p-5">
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4 pb-2">
                {stats?.dailyTrends?.map((day) => {
                  const maxOrders = Math.max(...(stats?.dailyTrends?.map((d) => d.orders) || [1]), 1)
                  const heightPercent = Math.max(10, Math.round((day.orders / maxOrders) * 100))

                  return (
                    <div key={day.date} className="flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] text-[var(--text-muted)] font-semibold mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {day.orders}
                      </div>
                      <div
                        className="w-full max-w-[36px] bg-[#0E7490] hover:bg-[#155E75] rounded-t transition-colors duration-150"
                        style={{ height: `${heightPercent}%` }}
                        title={`${day.label}: ${day.orders} orders (₹${day.revenue})`}
                      />
                      <span className="text-[10px] text-[var(--text-muted)] font-medium mt-2 truncate w-full text-center">
                        {day.label.split(' ')[0]}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#0E7490] rounded-sm" />
                    <span>Daily Volume</span>
                  </div>
                </div>
                <span>Hover a bar to view metrics</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── Status Pipeline ── */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--text)]">Status Pipeline</h3>
          </CardHeader>
          <CardBody className="space-y-3 p-5">
            {[
              { label: 'New / Confirmed', count: (stats?.statusBreakdown?.CONFIRMED || 0) + (stats?.statusBreakdown?.PENDING || 0), color: 'bg-blue-500' },
              { label: 'Printing', count: (stats?.statusBreakdown?.PRINTING || 0) + (stats?.statusBreakdown?.PROCESSING || 0), color: 'bg-purple-500' },
              { label: 'Ready for Pickup', count: (stats?.statusBreakdown?.PRINTED || 0) + (stats?.statusBreakdown?.READY || 0), color: 'bg-[#0E7490]' },
              { label: 'Collected / Done', count: (stats?.statusBreakdown?.COLLECTED || 0) + (stats?.statusBreakdown?.COMPLETED || 0), color: 'bg-green-600' },
              { label: 'Rejected / Cancelled', count: (stats?.statusBreakdown?.REJECTED || 0) + (stats?.statusBreakdown?.CANCELLED || 0), color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[var(--text-muted)]">{item.label}</span>
                  <span className="font-semibold tabular-nums text-[var(--text)]">{item.count}</span>
                </div>
                <div className="w-full bg-[var(--surface-hover)] h-1 rounded-full overflow-hidden">
                  <div
                    className={`${item.color} h-full rounded-full transition-all duration-150`}
                    style={{ width: `${Math.min(100, item.count * 10)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* ── Recent Orders Feed ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={15} strokeWidth={1.75} className="text-[#0E7490]" />
              <h3 className="text-sm font-semibold text-[var(--text)]">Recent Incoming Orders</h3>
            </div>
            <Link to={`/shops/${shopId}/orders`} className="text-xs text-[#0E7490] hover:text-[#155E75] flex items-center gap-1 font-medium transition-colors duration-150">
              View All <ArrowRight size={12} strokeWidth={1.75} />
            </Link>
          </div>
        </CardHeader>
        <CardBody className="p-0 divide-y divide-[var(--border)]">
          {stats?.recentOrders?.length === 0 ? (
            <EmptyState
              illustration={EmptyOrdersIllustration}
              title="No orders received yet today"
              description="Incoming customer print jobs will appear here in real time."
              className="py-8"
            />
          ) : (
            stats?.recentOrders?.map((ord) => (
              <div key={ord.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-[var(--surface-hover)] transition-colors duration-150">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center shrink-0">
                    <FileText size={13} strokeWidth={1.75} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <Link to={`/shops/${shopId}/orders/${ord.id}`} className="font-mono text-xs font-semibold text-[#0E7490] hover:text-[#155E75] transition-colors duration-150">
                      {ord.orderNumber}
                    </Link>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {ord.filesCount} file(s) • {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="tabular-nums font-semibold text-sm text-[var(--text)]">
                    ₹{Number(ord.totalAmount || 0).toFixed(2)}
                  </span>
                  <Badge variant={getStatusVariant(ord.status)} size="sm" dot>
                    {ord.status}
                  </Badge>
                  <Link to={`/shops/${shopId}/orders/${ord.id}`}>
                    <Button variant="secondary" size="sm">Manage</Button>
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

function DashStatCard({ icon: Icon, label, value, money = false, pulse = false }) {
  return (
    <Card className="hover:shadow-card-hover transition-shadow duration-150">
      <CardBody className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center shrink-0">
            <Icon size={14} strokeWidth={1.75} className="text-[var(--text-muted)]" />
          </div>
          {pulse && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </div>
        <div>
          <span className={`text-xl font-bold text-[var(--text)] block tracking-tight leading-tight ${money ? 'tabular-nums' : ''}`}>{value}</span>
          <span className="text-[11px] text-[var(--text-muted)] font-medium block truncate mt-0.5">{label}</span>
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
