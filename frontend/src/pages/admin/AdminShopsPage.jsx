import { useState, useEffect } from 'react'
import {
  Store,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function AdminShopsPage() {
  const [shops, setShops] = useState([])
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState(false)

  // Create Shop Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    ownerId: '',
  })

  const loadShops = async () => {
    try {
      setLoading(true)
      const [shopsRes, usersRes] = await Promise.all([
        api.get('/admin/shops', {
          params: {
            search: search || undefined,
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
          },
        }),
        api.get('/admin/users', { params: { role: 'OWNER' } }).catch(() => ({ data: { data: { users: [] } } })),
      ])
      setShops(shopsRes.data.data.shops || [])
      setOwners(usersRes.data.data?.users || [])
    } catch (err) {
      console.error('Failed to load shops:', err)
      toast.error('Failed to load shops')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShops()
  }, [statusFilter])

  const handleCreateShop = async (e) => {
    e.preventDefault()
    if (!createForm.name) {
      toast.error('Shop name is required')
      return
    }

    try {
      setActionLoading(true)
      await api.post('/admin/shops', createForm)
      toast.success(`Shop "${createForm.name}" created successfully!`)
      setShowCreateModal(false)
      setCreateForm({ name: '', address: '', phone: '', email: '', ownerId: '' })
      await loadShops()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create shop')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteShop = async (shop) => {
    if (
      !window.confirm(
        `PERMANENT DELETION WARNING:\n\nAre you sure you want to permanently delete shop "${shop.name}" (${shop.shopCode})?\n\nThis will permanently remove the shop, all associated orders, uploaded customer files, printers, pricing rules, and settings.\n\nThis action cannot be undone.`
      )
    )
      return

    try {
      setActionLoading(true)
      await api.delete(`/admin/shops/${shop.id}`)
      toast.success(`Shop "${shop.name}" deleted permanently`)
      await loadShops()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete shop')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateStatus = async (shopId, newStatus) => {
    const actionLabel = newStatus === 'ACTIVE' ? 'activate' : 'suspend'
    if (!window.confirm(`Are you sure you want to ${actionLabel} this print shop?`)) return

    try {
      setActionLoading(true)
      await api.patch(`/admin/shops/${shopId}/status`, {
        status: newStatus,
        reason: `Super Admin marked as ${newStatus}`,
      })
      toast.success(`Shop status updated to ${newStatus}`)
      await loadShops()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update shop status')
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
      toast.success(`Subscription tier updated to ${subscriptionTier}`)
      await loadShops()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tier')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Store className="text-[#0E7490]" size={20} strokeWidth={2} />
            Shop Management & Tenant Control
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Create new tenant shops, configure subscriptions, suspend or activate storefronts, and delete tenant nodes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0E7490] hover:bg-[#155E75] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors duration-150"
          >
            <Plus size={14} strokeWidth={2} />
            Create Shop
          </button>
          <button
            onClick={loadShops}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150"
          >
            <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={(e) => { e.preventDefault(); loadShops(); }} className="relative w-full sm:w-80">
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
                <th className="py-2.5 px-4">Shop Code</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Subscription Plan</th>
                <th className="py-2.5 px-4">Workload Metrics</th>
                <th className="py-2.5 px-4 text-right">Moderation Controls</th>
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
                  <tr key={shop.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-12">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-xs text-[var(--text)] flex items-center gap-1.5">
                        <span>{shop.name}</span>
                        <a
                          href={`/shops/${shop.shopCode}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Customer QR Upload Portal"
                          className="text-[#0E7490] hover:text-[#155E75]"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {shop.address || shop.phone || shop.email || 'No contact details'}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-xs text-[#0E7490]">{shop.shopCode}</td>
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
                      <div className="flex items-center justify-end gap-1.5">
                        {shop.status === 'SUSPENDED' ? (
                          <button
                            onClick={() => handleUpdateStatus(shop.id, 'ACTIVE')}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 rounded-lg text-xs font-medium transition-colors"
                          >
                            <CheckCircle2 size={12} strokeWidth={1.75} />
                            Activate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(shop.id, 'SUSPENDED')}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 rounded-lg text-xs font-medium transition-colors"
                          >
                            <AlertTriangle size={12} strokeWidth={1.75} />
                            Suspend
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteShop(shop)}
                          disabled={actionLoading}
                          title="Permanently Delete Shop & All Data"
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-500/15 transition-colors"
                        >
                          <Trash2 size={13} strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE SHOP MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">Create Print Shop</h3>
                <p className="text-xs text-[var(--text-muted)]">Initialize a new tenant node with default pricing & settings.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="p-5 space-y-4">
              <div>
                <label className="label text-xs">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Metro Quick Prints"
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label text-xs">Shop Address / Location</label>
                <input
                  type="text"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  placeholder="e.g. Ground Floor, Tech Park"
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Phone Number</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-xs">Shop Contact Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="contact@shop.com"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs">Assign Existing Owner (Optional)</label>
                <select
                  value={createForm.ownerId}
                  onChange={(e) => setCreateForm({ ...createForm, ownerId: e.target.value })}
                  className="input text-xs"
                >
                  <option value="">Assign to Me (Super Admin)</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name || o.email} ({o.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#0E7490] hover:bg-[#155E75] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {actionLoading ? 'Creating Shop...' : 'Create Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
