import { useState, useEffect } from 'react'
import {
  Store,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import api from '../../lib/api'

export default function AdminShopsPage() {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState(false)

  const loadShops = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/shops', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      })
      setShops(res.data.data.shops || [])
    } catch (err) {
      console.error('Failed to load shops:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShops()
  }, [statusFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadShops()
  }

  const handleUpdateStatus = async (shopId, newStatus) => {
    const actionLabel = newStatus === 'ACTIVE' ? 'activate/approve' : 'suspend'
    if (!window.confirm(`Are you sure you want to ${actionLabel} this print shop?`)) return

    try {
      setActionLoading(true)
      await api.patch(`/admin/shops/${shopId}/status`, {
        status: newStatus,
        reason: `Super Admin marked as ${newStatus}`,
      })
      await loadShops()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update shop status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateTier = async (shopId, subscriptionTier) => {
    try {
      setActionLoading(true)
      await api.patch(`/admin/shops/${shopId}/status`, {
        subscriptionTier,
        reason: `Subscription tier changed to ${subscriptionTier}`,
      })
      await loadShops()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update tier')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Store className="text-primary-600" size={24} />
            Shop Moderation & Tenant Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review, approve, suspend, and configure subscription tiers for all platform print shops.
          </p>
        </div>

        <button
          onClick={loadShops}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-surface-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-surface-50 shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-surface-200 rounded-2xl p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by shop name, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-surface-50 text-slate-600 hover:bg-surface-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Shops Table */}
      <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 text-slate-500 border-b border-surface-100 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Shop Details</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Plan / Tier</th>
                <th className="py-3 px-4">Metrics</th>
                <th className="py-3 px-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700 font-medium">
              {shops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No shops match the search or status filter.
                  </td>
                </tr>
              ) : (
                shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{shop.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{shop.email || 'No email registered'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{shop.shopCode}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          shop.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {shop.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={shop.subscriptionTier || 'FREE'}
                        onChange={(e) => handleUpdateTier(shop.id, e.target.value)}
                        className="px-2 py-1 bg-surface-50 border border-surface-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                      >
                        <option value="FREE">Free Tier</option>
                        <option value="STARTER">Starter Plan</option>
                        <option value="PRO">Pro Business</option>
                        <option value="ENTERPRISE">Enterprise</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{shop._count?.orders || 0} Orders</div>
                      <div className="text-[11px] text-slate-400">{shop._count?.printers || 0} Printers</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {shop.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleUpdateStatus(shop.id, 'ACTIVE')}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <CheckCircle2 size={13} />
                          Approve / Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(shop.id, 'SUSPENDED')}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <AlertTriangle size={13} />
                          Suspend Shop
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
