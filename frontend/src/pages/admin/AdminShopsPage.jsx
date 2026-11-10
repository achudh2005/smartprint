import { useState, useEffect } from 'react'
import {
  Store,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Store className="text-[#0E7490]" size={18} strokeWidth={1.75} />
            Shop Moderation & Tenant Control
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Review, approve, suspend, and configure subscription tiers for all platform print shops.
          </p>
        </div>

        <button
          onClick={loadShops}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={14} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search by shop name, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-9 text-xs"
          />
        </form>

        <div className="flex items-center gap-1 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                statusFilter === st
                  ? 'bg-[#0E7490] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Shops Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-hover)] text-[var(--text-muted)] border-b border-[var(--border)] uppercase tracking-wider text-[11px] font-semibold sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Shop Details</th>
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Plan / Tier</th>
                <th className="py-2.5 px-4">Metrics</th>
                <th className="py-2.5 px-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
              {shops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[var(--text-muted)]">
                    No shops match the search or status filter.
                  </td>
                </tr>
              ) : (
                shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-11">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-xs text-[var(--text)]">{shop.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{shop.email || 'No email registered'}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-xs">{shop.shopCode}</td>
                    <td className="py-2.5 px-4">
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
                    </td>
                    <td className="py-2.5 px-4">
                      <select
                        value={shop.subscriptionTier || 'FREE'}
                        onChange={(e) => handleUpdateTier(shop.id, e.target.value)}
                        className="px-2 py-1 bg-[var(--surface-hover)] border border-[var(--border)] rounded-md text-xs font-medium text-[var(--text)] focus:outline-hidden"
                      >
                        <option value="FREE">Free Tier</option>
                        <option value="STARTER">Starter Plan</option>
                        <option value="PRO">Pro Business</option>
                        <option value="ENTERPRISE">Enterprise</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-muted)]">
                      <div className="tabular-nums font-medium text-[var(--text)]">{shop._count?.orders || 0} Orders</div>
                      <div className="text-[11px] text-[var(--text-muted)] tabular-nums">{shop._count?.printers || 0} Printers</div>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {shop.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleUpdateStatus(shop.id, 'ACTIVE')}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 rounded-lg text-xs font-medium transition-colors"
                        >
                          <CheckCircle2 size={12} strokeWidth={1.75} />
                          Approve / Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(shop.id, 'SUSPENDED')}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 rounded-lg text-xs font-medium transition-colors"
                        >
                          <AlertTriangle size={12} strokeWidth={1.75} />
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
