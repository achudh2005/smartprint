import { useState, useEffect } from 'react'
import {
  Store,
  Users,
  ShoppingBag,
  TrendingUp,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Clock,
  KeyRound,
  AlertTriangle,
} from 'lucide-react'
import api from '../../lib/api'

export default function AdminOverviewPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadOverview = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/overview')
      setData(res.data.data)
    } catch (err) {
      console.error('Failed to load admin overview:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [])

  const kpis = data?.kpis || {}
  const suspiciousTargets = data?.suspiciousTargets || []
  const recentShops = data?.recentShops || []
  const recentAudits = data?.recentAudits || []

  const formatBytes = (bytesStr) => {
    const bytes = Number(bytesStr || 0)
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    if (i < 0 || i >= sizes.length) return `${bytes} B`
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)] tracking-tight">Platform Control Center</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Global metrics, tenant health, authentication tracking, and platform-wide monitoring.
          </p>
        </div>

        <button
          onClick={loadOverview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150 self-start sm:self-auto"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          Refresh Metrics
        </button>
      </div>

      {/* Suspicious Activity Banner */}
      {suspiciousTargets.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} strokeWidth={2} />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
              Suspicious Activity Detected ({suspiciousTargets.length} alert{suspiciousTargets.length > 1 ? 's' : ''})
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Multiple repeated failed login attempts were recorded within the past hour:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {suspiciousTargets.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/20"
                >
                  <strong>{item.target}</strong>: {item.count} failed attempts
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shops */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Shops</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <Store size={14} strokeWidth={1.75} className="text-[#0E7490]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tracking-tight tabular-nums">
            {kpis.totalShops || 0}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center justify-between">
            <span className="text-green-600 dark:text-green-400 font-medium">{kpis.activeShops || 0} Active</span>
            <span className="text-red-600 dark:text-red-400 font-medium">{kpis.suspendedShops || 0} Suspended</span>
          </div>
        </div>

        {/* Shop Owners & Accounts */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Shop Owners</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <Users size={14} strokeWidth={1.75} className="text-[#0E7490]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tracking-tight tabular-nums">
            {kpis.totalShopOwners ?? (kpis.totalUsers || 0)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-3">
            <span className="text-green-600 dark:text-green-400 font-medium">{kpis.activeUsers || 0} Active</span>
            <span className="text-amber-500 font-medium">{kpis.inactiveUsers || 0} Inactive</span>
            <span className="text-red-500 font-medium">{kpis.suspendedUsers || 0} Suspended</span>
          </div>
        </div>

        {/* Logins Today & Week */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Successful Logins</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <KeyRound size={14} strokeWidth={1.75} className="text-[#0E7490]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tracking-tight tabular-nums">
            {kpis.todayLogins ?? 0}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center justify-between">
            <span>Today: {kpis.todayLogins ?? 0}</span>
            <span className="text-[#0E7490] font-medium">{kpis.weekLogins ?? 0} this week</span>
          </div>
        </div>

        {/* Security & Failed Logins */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Failed Logins (1h)</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <ShieldAlert size={14} strokeWidth={1.75} className={kpis.failedLoginsHour > 0 ? 'text-red-500' : 'text-zinc-400'} />
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight tabular-nums ${kpis.failedLoginsHour > 0 ? 'text-red-500' : 'text-[var(--text)]'}`}>
            {kpis.failedLoginsHour ?? 0}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {kpis.failedLoginsHour === 0 ? 'No brute-force or auth failures' : 'Auth rejections in past 60 min'}
          </p>
        </div>
      </div>

      {/* Secondary Metrics: Revenue & Orders & Storage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Platform Revenue</span>
            <TrendingUp size={14} className="text-green-600" />
          </div>
          <div className="text-xl font-bold text-[var(--text)]">
            ₹{(kpis.totalPlatformRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Processed across all tenant shops</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Customer Orders</span>
            <ShoppingBag size={14} className="text-[#0E7490]" />
          </div>
          <div className="text-xl font-bold text-[var(--text)]">
            {(kpis.totalOrders || 0).toLocaleString()}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Cloud print orders fulfilled</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Storage Footprint</span>
            <HardDrive size={14} className="text-[#0E7490]" />
          </div>
          <div className="text-xl font-bold text-[var(--text)]">
            {formatBytes(kpis.storage?.activeBytes)} active
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {formatBytes(kpis.storage?.purgedBytes)} auto-purged
          </p>
        </div>
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shops */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center justify-between">
            <span>Recently Provisioned Shops</span>
            <span className="text-xs font-normal text-[var(--text-muted)]">Latest 5</span>
          </h2>
          {recentShops.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-4 text-center">No shops created yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recentShops.map((shop) => (
                <div key={shop.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text)]">{shop.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">Code: {shop.shopCode}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                        shop.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400'
                      }`}
                    >
                      {shop.status}
                    </span>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {shop._count?.orders || 0} orders
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Audit Events */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center justify-between">
            <span>Latest Security & Audit Events</span>
            <span className="text-xs font-normal text-[var(--text-muted)]">Live Log</span>
          </h2>
          {recentAudits.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-4 text-center">No audit records found.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recentAudits.slice(0, 5).map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[#0E7490]">{log.action}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {log.user ? `${log.user.name || log.user.email} (${log.user.role})` : 'System Event'}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">
                    {log.ipAddress || '-'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
