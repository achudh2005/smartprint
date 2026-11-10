import { useState, useEffect } from 'react'
import {
  Store,
  Users,
  ShoppingBag,
  TrendingUp,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Clock,
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
          <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight">Platform Control Center</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Global metrics, tenant health, storage allocation, and platform-wide activity.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Registered Users</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <Users size={14} strokeWidth={1.75} className="text-[#0E7490]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tracking-tight tabular-nums">
            {kpis.totalUsers || 0}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Platform owners & staff accounts</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Platform Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <TrendingUp size={14} strokeWidth={1.75} className="text-[#0E7490]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tracking-tight tabular-nums">
            ₹{kpis.totalPlatformRevenue || 0}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Gross verified customer payments</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Storage Usage</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <HardDrive size={14} strokeWidth={1.75} className="text-[#0E7490]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tracking-tight">
            {formatBytes(kpis.storage?.activeBytes)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center justify-between">
            <span>Active: {formatBytes(kpis.storage?.activeBytes)}</span>
            <span className="text-green-600 dark:text-green-400">Purged: {formatBytes(kpis.storage?.purgedBytes)}</span>
          </div>
        </div>
      </div>

      {/* Recent Shops & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registered Shops */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <Store size={15} strokeWidth={1.75} className="text-[#0E7490]" />
            Recently Registered Print Shops
          </h2>

          <div className="divide-y divide-[var(--border)]">
            {recentShops.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center">No registered shops found.</p>
            ) : (
              recentShops.map((shop) => (
                <div key={shop.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text)]">{shop.name}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">{shop.shopCode}</p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                        shop.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                          : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                      }`}
                    >
                      <span className={`w-1 h-1 rounded-full ${shop.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {shop.status}
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] tabular-nums mt-1">{shop._count?.orders || 0} orders</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security Audit Activity */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <ShieldCheck size={15} strokeWidth={1.75} className="text-[#0E7490]" />
            Recent Security & Administrative Actions
          </h2>

          <div className="divide-y divide-[var(--border)]">
            {recentAudits.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center">No audit logs recorded yet.</p>
            ) : (
              recentAudits.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-[var(--text)] uppercase tracking-wider text-[11px]">
                      {log.action}
                    </span>
                    <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
                      By: {log.user?.name || log.user?.email || 'System'} {log.shop ? `at ${log.shop.name}` : ''}
                    </p>
                  </div>

                  <span className="text-[11px] text-[var(--text-muted)] shrink-0 flex items-center gap-1 font-mono">
                    <Clock size={11} strokeWidth={1.75} />
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
