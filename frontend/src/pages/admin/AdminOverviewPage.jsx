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
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Global metrics, tenant health, storage allocation, and platform-wide activity.
          </p>
        </div>

        <button
          onClick={loadOverview}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-surface-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-surface-50 shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Metrics
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Shops</span>
            <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Store size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {kpis.totalShops || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span className="text-emerald-600 font-semibold">{kpis.activeShops || 0} Active</span>
            <span className="text-rose-600 font-semibold">{kpis.suspendedShops || 0} Suspended</span>
          </div>
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Users</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {kpis.totalUsers || 0}
          </div>
          <p className="text-xs text-slate-400 mt-2">Platform owners & staff accounts</p>
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Platform Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{kpis.totalPlatformRevenue || 0}
          </div>
          <p className="text-xs text-slate-400 mt-2">Gross verified customer payments</p>
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Storage Usage</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <HardDrive size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatBytes(kpis.storage?.activeBytes)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Active: {formatBytes(kpis.storage?.activeBytes)}</span>
            <span className="text-emerald-600">Purged: {formatBytes(kpis.storage?.purgedBytes)}</span>
          </div>
        </div>
      </div>

      {/* Recent Shops & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Registered Shops */}
        <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Store size={18} className="text-primary-600" />
            Recently Registered Print Shops
          </h2>

          <div className="divide-y divide-surface-100">
            {recentShops.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No registered shops found.</p>
            ) : (
              recentShops.map((shop) => (
                <div key={shop.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{shop.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{shop.shopCode}</p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        shop.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {shop.status}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">{shop._count?.orders || 0} orders</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security Audit Activity */}
        <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            Recent Security & Administrative Actions
          </h2>

          <div className="divide-y divide-surface-100">
            {recentAudits.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit logs recorded yet.</p>
            ) : (
              recentAudits.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      {log.action}
                    </span>
                    <p className="text-slate-500 mt-0.5">
                      By: {log.user?.name || log.user?.email || 'System'} {log.shop ? `at ${log.shop.name}` : ''}
                    </p>
                  </div>

                  <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock size={12} />
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
