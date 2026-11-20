import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  Users,
  ShieldAlert,
  RefreshCw,
  KeyRound,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  TrendingUp,
  Activity,
  CheckCircle2,
  CreditCard,
  Clock,
  Sparkles,
} from 'lucide-react'
import api from '../../lib/api'
import { StatCard, Card, CardHeader, CardBody, Badge, Button, TableSkeleton } from '../../components/ui'
import toast from 'react-hot-toast'

export default function AdminOverviewPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reactivatingUserId, setReactivatingUserId] = useState(null)

  const loadOverview = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/overview')
      setData(res.data.data)
    } catch (err) {
      console.error('Failed to load admin overview:', err)
      toast.error('Failed to load platform metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [])

  const handleQuickReactivate = async (userId) => {
    try {
      setReactivatingUserId(userId)
      await api.patch(`/admin/users/${userId}/status`, { status: 'ACTIVE' })
      toast.success(`User #${userId} account reactivated successfully!`)
      await loadOverview()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reactivate user')
    } finally {
      setReactivatingUserId(null)
    }
  }

  const kpis = data?.kpis || {}
  const subKpis = data?.subscriptionKPIs || kpis.subscription || {}
  const suspiciousTargets = data?.suspiciousTargets || []
  const recentShops = data?.recentShops || []
  const recentAudits = data?.recentAudits || []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)] tracking-tight">Platform Overview</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Real-time multi-tenant telemetry, security alerts, and system health.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadOverview}
          loading={loading}
          className="self-start sm:self-auto text-xs"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Metrics</span>
        </Button>
      </div>

      {/* Suspicious Activity / Brute-Force Alerts */}
      {suspiciousTargets.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} strokeWidth={2} />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
                  Suspicious Login Failures Detected ({suspiciousTargets.length} Incident{suspiciousTargets.length > 1 ? 's' : ''})
                </h3>
                <Badge variant="red" dot>Brute-Force Risk</Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Repeated failed logins detected within the last 15–60 minutes. Accounts with 5+ failures are automatically locked to safeguard shop data.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                {suspiciousTargets.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-black/40 border border-red-500/20 text-xs"
                  >
                    <div className="min-w-0 mr-2">
                      <p className="font-mono font-semibold text-[var(--text)] truncate">{item.email}</p>
                      <p className="text-[11px] text-red-500 font-medium">
                        {item.failedAttempts} failure{item.failedAttempts > 1 ? 's' : ''} {item.isAutoSuspended ? '• Auto-Suspended' : ''}
                      </p>
                    </div>
                    {item.userId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-[11px] h-7 px-2 shrink-0"
                        loading={reactivatingUserId === item.userId}
                        onClick={() => handleQuickReactivate(item.userId)}
                      >
                        <UserCheck size={12} className="text-emerald-500" />
                        <span>Unlock</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Grid (using shared StatCard component) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Shop Owners"
          value={loading ? '...' : (kpis.totalShopOwners ?? (kpis.totalUsers || 0))}
          icon={Users}
          description={`${kpis.activeUsers || 0} active, ${kpis.suspendedUsers || 0} suspended`}
        />

        <StatCard
          label="Active Shops"
          value={loading ? '...' : (kpis.activeShops || 0)}
          icon={Store}
          description={`${kpis.totalShops || 0} total registered shops`}
        />

        <StatCard
          label="Logins Today"
          value={loading ? '...' : (kpis.todayLogins ?? 0)}
          icon={KeyRound}
          description={`${kpis.weekLogins ?? 0} logins this week`}
        />

        <StatCard
          label="Failed Logins (1h)"
          value={loading ? '...' : (kpis.failedLoginsHour ?? 0)}
          icon={ShieldAlert}
          change={kpis.failedLoginsHour > 0 ? 'Alert' : 'Nominal'}
          changeType={kpis.failedLoginsHour > 0 ? 'negative' : 'positive'}
          description={kpis.failedLoginsHour === 0 ? 'No brute-force activity' : 'Auth failures in past hour'}
        />
      </div>

      {/* Subscription & Recurring Revenue (MRR) Telemetry */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={17} className="text-[#007AFF] dark:text-[#0A84FF]" />
            <h2 className="text-xs sm:text-sm font-bold text-[var(--text)] uppercase tracking-wider">
              Tenant Subscriptions & Monthly Recurring Revenue (MRR)
            </h2>
          </div>
          <Link
            to="/admin/shops"
            className="text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF] hover:underline flex items-center gap-1"
          >
            <span>Manage All Shops</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard
            label="Shops on Trial"
            value={loading ? '...' : (subKpis.trialCount ?? 0)}
            icon={Sparkles}
            description="Active 1-month trials"
          />

          <StatCard
            label="Active Paying Shops"
            value={loading ? '...' : (subKpis.activeCount ?? 0)}
            icon={CheckCircle2}
            description="Paid monthly licenses"
          />

          <StatCard
            label="Past Due (Grace)"
            value={loading ? '...' : (subKpis.pastDueCount ?? 0)}
            icon={Clock}
            change={subKpis.pastDueCount > 0 ? 'Follow-up' : 'Nominal'}
            changeType={subKpis.pastDueCount > 0 ? 'negative' : 'positive'}
            description="3-day grace period"
          />

          <StatCard
            label="Expired / Lapsed"
            value={loading ? '...' : (subKpis.expiredCount ?? 0)}
            icon={AlertTriangle}
            description="Storefront & portal paused"
          />

          <StatCard
            label="Estimated MRR"
            value={loading ? '...' : `₹${(subKpis.estimatedMRR || 0).toLocaleString('en-IN')}`}
            icon={TrendingUp}
            description="Active × ₹499/mo license"
          />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            <span>Platform Revenue</span>
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-[var(--text)] tabular-nums">
            ₹{(kpis.totalPlatformRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">Gross order revenue across all active shops</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            <span>Completed Orders</span>
            <CheckCircle2 size={14} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-[var(--text)] tabular-nums">
            {(kpis.completedOrders || 0).toLocaleString()}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">{kpis.totalOrders || 0} total orders processed</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            <span>Live Security State</span>
            <Activity size={14} className="text-[#007AFF]" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-500">
            Guarded
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">Brute-force auto-lock & session limits active</p>
        </Card>
      </div>

      {/* Recent Shops & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shops */}
        <Card>
          <CardHeader className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Recently Provisioned Shops</h2>
              <p className="text-xs text-[var(--text-muted)]">Latest tenant shops registered</p>
            </div>
            <Link to="/admin/shops" className="text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF] hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <TableSkeleton rows={4} cols={3} />
            ) : recentShops.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">No shops registered yet.</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {recentShops.map((s) => (
                  <div key={s.id} className="p-3.5 sm:px-5 flex items-center justify-between text-xs hover:bg-[rgba(0,122,255,0.04)] transition-colors">
                    <div className="min-w-0 mr-3">
                      <p className="font-semibold text-[var(--text)] truncate">{s.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">Owner: {s.owner?.email || s.owner?.name || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={s.status === 'ACTIVE' ? 'green' : 'red'} dot>
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Security Audits */}
        <Card>
          <CardHeader className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Live Security Audit Log</h2>
              <p className="text-xs text-[var(--text-muted)]">Most recent administrative & auth events</p>
            </div>
            <Link to="/admin/audit-logs" className="text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF] hover:underline flex items-center gap-1">
              <span>View All Logs</span>
              <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <TableSkeleton rows={4} cols={3} />
            ) : recentAudits.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">No security logs recorded yet.</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {recentAudits.map((a) => (
                  <div key={a.id} className="p-3.5 sm:px-5 flex items-center justify-between text-xs hover:bg-[rgba(0,122,255,0.04)] transition-colors">
                    <div className="min-w-0 mr-3">
                      <p className="font-mono font-medium text-[var(--text)] truncate">{a.action}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        Actor: {a.user?.name || a.user?.email || 'System'} • {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        a.action === 'LOGIN_SUCCESS' ? 'green'
                        : a.action === 'LOGIN_FAILED' || a.action?.includes('SUSPEND') ? 'red'
                        : 'blue'
                      }
                      dot
                    >
                      {a.action}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
