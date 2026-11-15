import { useState, useEffect } from 'react'
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  FileText,
  CreditCard,
  X,
  Store,
} from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [shopFilter, setShopFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadOrders = async () => {
    try {
      setLoading(true)
      const [ordersRes, shopsRes] = await Promise.all([
        api.get('/admin/orders', {
          params: {
            search: search || undefined,
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            shopId: shopFilter || undefined,
          },
        }),
        api.get('/admin/shops').catch(() => ({ data: { data: { shops: [] } } })),
      ])
      setOrders(ordersRes.data.data?.orders || [])
      setShops(shopsRes.data.data?.shops || [])
    } catch (err) {
      console.error('Failed to load orders:', err)
      toast.error('Failed to load platform orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [statusFilter, shopFilter])

  const handleDeleteOrder = async (order) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete Order #${order.orderNumber}?\n\nThis will remove the order, its uploaded files, and all associated status logs.`
      )
    )
      return

    try {
      setActionLoading(true)
      await api.delete(`/admin/orders/${order.id}`)
      toast.success(`Order #${order.orderNumber} deleted permanently`)
      if (selectedOrder?.id === order.id) setSelectedOrder(null)
      await loadOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete order')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase()
    if (s === 'COMPLETED' || s === 'PRINTED') {
      return 'bg-green-500/10 text-green-600 border-green-500/20'
    }
    if (s === 'PENDING' || s === 'PAYMENT_PENDING') {
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    }
    if (s === 'CANCELLED' || s === 'REJECTED' || s === 'FAILED') {
      return 'bg-red-500/10 text-red-600 border-red-500/20'
    }
    return 'bg-cyan-500/10 text-[#0E7490] border-cyan-500/20'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-[#0E7490]" size={20} strokeWidth={2} />
            Master Orders Explorer
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Inspect, filter, and moderate print orders across all platform tenant shops.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={(e) => { e.preventDefault(); loadOrders(); }} className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={14} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search order #, customer name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-9 text-xs"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Shop Filter */}
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="input h-9 text-xs font-medium w-full sm:w-48"
          >
            <option value="">All Tenant Shops</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input h-9 text-xs font-medium w-full sm:w-36"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
            <option value="PAID">PAID</option>
            <option value="PRINTING">PRINTING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-hover)] text-[var(--text-muted)] border-b border-[var(--border)] uppercase tracking-wider text-[11px] font-semibold sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Order #</th>
                <th className="py-2.5 px-4">Tenant Shop</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Files / Pages</th>
                <th className="py-2.5 px-4">Total Amount</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Created</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[var(--text-muted)]">
                    No orders found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const totalPages = o.orderFiles?.reduce((acc, f) => acc + (f.pageCount || 1), 0) || 0
                  return (
                    <tr key={o.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-12">
                      <td className="py-2.5 px-4 font-mono font-semibold text-xs text-[var(--text)]">
                        #{o.orderNumber || o.id}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        <span className="font-semibold text-[var(--text)]">{o.shop?.name || 'Unknown'}</span>
                        <span className="block text-[10px] text-[var(--text-muted)] font-mono">{o.shop?.shopCode}</span>
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        <span className="font-medium text-[var(--text)]">{o.customerName || 'Anonymous Customer'}</span>
                        <span className="block text-[10px] text-[var(--text-muted)] font-mono">{o.customerPhone || o.customerEmail || '-'}</span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono">
                        {o.orderFiles?.length || 0} file(s) &bull; {totalPages} pgs
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-xs text-[var(--text)]">
                        ₹{Number(o.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-[var(--text-muted)] font-mono whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            title="Inspect Order Details"
                            className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[#0E7490] transition-colors"
                          >
                            <Eye size={13} strokeWidth={1.75} />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(o)}
                            title="Delete Order Permanently"
                            className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-500/15 transition-colors"
                          >
                            <Trash2 size={13} strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ORDER DETAILS MODAL ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">
                  Order #{selectedOrder.orderNumber || selectedOrder.id}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Tenant: {selectedOrder.shop?.name} ({selectedOrder.shop?.shopCode})
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-96 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)]">
                <div>
                  <span className="text-[var(--text-muted)]">Customer:</span>
                  <p className="font-semibold text-[var(--text)]">{selectedOrder.customerName || 'Anonymous'}</p>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Phone / Email:</span>
                  <p className="font-mono text-[var(--text)]">{selectedOrder.customerPhone || selectedOrder.customerEmail || '-'}</p>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Total Amount:</span>
                  <p className="font-bold text-sm text-[#0E7490]">₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Status:</span>
                  <p className="font-semibold">{selectedOrder.status}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--text)] mb-2 flex items-center gap-1.5">
                  <FileText size={14} className="text-[#0E7490]" />
                  Uploaded Documents ({selectedOrder.orderFiles?.length || 0})
                </h4>
                <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden">
                  {selectedOrder.orderFiles?.map((f) => (
                    <div key={f.id} className="p-3 flex items-center justify-between bg-[var(--surface)]">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text)] truncate">{f.fileName}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-mono">
                          {f.pageCount || 1} pages &bull; {f.colorMode} &bull; {f.fileSizeBytes ? `${(f.fileSizeBytes / 1024).toFixed(0)} KB` : 'N/A'}
                        </p>
                      </div>
                      {f.isPurged && (
                        <span className="text-[10px] text-zinc-500 font-mono bg-zinc-500/10 px-1.5 py-0.5 rounded">
                          Purged
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.payments?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-[var(--text)] mb-2 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-green-600" />
                    Payment Record
                  </h4>
                  <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
                    {selectedOrder.payments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <span>{p.paymentMethod || 'Online Payment'}</span>
                        <span className="font-bold text-green-600">₹{Number(p.amount).toFixed(2)} ({p.status})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] flex justify-between items-center bg-[var(--surface-hover)]">
              <button
                onClick={() => handleDeleteOrder(selectedOrder)}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-lg text-xs font-medium transition-colors"
              >
                Delete This Order
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
