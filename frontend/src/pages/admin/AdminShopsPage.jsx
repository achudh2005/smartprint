import { useState, useEffect } from 'react'
import {
  Store,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Download,
} from 'lucide-react'
import api from '../../lib/api'
import {
  Card,
  CardBody,
  Badge,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableSkeleton,
  EmptyState,
  Modal,
} from '../../components/ui'
import { exportToCsv } from '../../lib/csvExport'
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
      toast.success(`Shop "${shop.name}" permanently deleted`)
      await loadShops()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete shop')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleStatus = async (shop) => {
    const nextStatus = shop.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    const confirmMessage =
      nextStatus === 'SUSPENDED'
        ? `Are you sure you want to suspend "${shop.name}"? Customer storefront and QR portal ordering will be immediately blocked.`
        : `Reactivate "${shop.name}"? Customer portal and printing will be restored immediately.`

    if (!window.confirm(confirmMessage)) return

    try {
      setActionLoading(true)
      await api.patch(`/admin/shops/${shop.id}/status`, { status: nextStatus })
      toast.success(`Shop ${shop.name} is now ${nextStatus}`)
      await loadShops()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update shop status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleTierChange = async (shop, newTier) => {
    try {
      setActionLoading(true)
      await api.patch(`/admin/shops/${shop.id}/tier`, { tier: newTier })
      toast.success(`Shop ${shop.name} plan updated to ${newTier}`)
      await loadShops()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tier')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportCsv = () => {
    const columns = [
      { label: 'Shop ID', key: 'id' },
      { label: 'Shop Name', key: 'name' },
      { label: 'Shop Code', key: 'shopCode' },
      { label: 'Status', key: 'status' },
      { label: 'Tier', key: 'tier' },
      { label: 'Owner Email', accessor: (s) => s.owner?.email || '' },
      { label: 'Owner Name', accessor: (s) => s.owner?.name || '' },
      { label: 'Phone', key: 'phone' },
      { label: 'Address', key: 'address' },
      { label: 'Total Orders', accessor: (s) => s._count?.orders ?? 0 },
      { label: 'Printers', accessor: (s) => s._count?.printers ?? 0 },
      { label: 'Created At', accessor: (s) => new Date(s.createdAt).toISOString() },
    ]

    const success = exportToCsv(`smartprint_shops_${new Date().toISOString().slice(0, 10)}`, shops, columns)
    if (success) {
      toast.success(`Exported ${shops.length} shops to CSV`)
    } else {
      toast.error('No shop records to export')
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Store className="text-[#007AFF] dark:text-[#0A84FF]" size={22} strokeWidth={2} />
            <span>Shop Management & Multi-Tenant Control</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Provision new tenant shops, manage subscriptions, moderate storefront availability, and review workload.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={shops.length === 0}
            className="text-xs"
          >
            <Download size={13} strokeWidth={1.75} />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="text-xs"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Create Shop</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadShops}
            loading={loading}
            className="text-xs"
          >
            <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={(e) => { e.preventDefault(); loadShops(); }} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={14} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search by shop name, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-9 text-xs w-full"
          />
        </form>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#007AFF] text-white shadow-xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {/* Shops Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : shops.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No shops found"
            description="No tenant shops match the current search or status filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Shop Details</TableHead>
                <TableHead>Code & Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription Plan</TableHead>
                <TableHead className="text-right">Workload Metrics</TableHead>
                <TableHead className="text-right">Moderation Controls</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {shops.map((shop) => (
                <TableRow key={shop.id}>
                  <TableCell>
                    <div>
                      <div className="font-bold text-xs text-[var(--text)]">{shop.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs">{shop.address || 'No physical address'}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                        Owner: {shop.owner?.name || shop.owner?.email || 'Unassigned'}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF] px-1.5 py-0.5 rounded bg-[#007AFF]/10">
                        {shop.shopCode}
                      </span>
                      <a
                        href={`/s/${shop.shopCode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1"
                        title="Open customer storefront"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={shop.status === 'ACTIVE' ? 'green' : 'red'} dot>
                      {shop.status}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <select
                      value={shop.tier || 'FREE'}
                      onChange={(e) => handleTierChange(shop, e.target.value)}
                      disabled={actionLoading}
                      className="input py-1 px-2 text-xs rounded-lg h-7 font-medium w-auto"
                    >
                      <option value="FREE">FREE Tier</option>
                      <option value="PRO">PRO Tier</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </TableCell>

                  <TableCell className="text-right font-mono text-xs text-[var(--text-muted)]">
                    <div>{shop._count?.orders ?? 0} Orders</div>
                    <div className="text-[10px]">{shop._count?.printers ?? 0} Printers</div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant={shop.status === 'ACTIVE' ? 'secondary' : 'primary'}
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleToggleStatus(shop)}
                        className="text-xs h-7 px-2"
                      >
                        {shop.status === 'ACTIVE' ? (
                          <>
                            <AlertTriangle size={12} className="text-amber-500" />
                            <span>Suspend</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span>Reactivate</span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleDeleteShop(shop)}
                        className="text-xs h-7 px-2"
                        title="Permanently remove shop node"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create Shop Modal (using shared Modal component) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Provision New Tenant Shop"
        subtitle="Registers a new shop entity and optionally links it to an existing shop owner"
      >
        <form onSubmit={handleCreateShop} className="space-y-4">
          <Input
            label="Shop Name *"
            placeholder="e.g. University Campus Print Hub"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            required
          />

          <Input
            label="Shop Address"
            placeholder="Room 102, Academic Block A"
            value={createForm.address}
            onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contact Phone"
              placeholder="+91 9876543210"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
            <Input
              label="Contact Email"
              type="email"
              placeholder="shop@campusprint.com"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="label">Assign Shop Owner</label>
            <select
              value={createForm.ownerId}
              onChange={(e) => setCreateForm({ ...createForm, ownerId: e.target.value })}
              className="input text-xs"
            >
              <option value="">-- Leave Unassigned (Can assign later) --</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || o.email} ({o.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={actionLoading}
            >
              Provision Shop
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
