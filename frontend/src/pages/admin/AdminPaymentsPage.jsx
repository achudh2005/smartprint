import { useState, useEffect } from 'react'
import {
  CreditCard,
  Search,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const loadPayments = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/payments', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      })
      setPayments(res.data.data?.payments || [])
    } catch (err) {
      console.error('Failed to load payments:', err)
      toast.error('Failed to load platform payment ledger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [statusFilter])

  const totalRevenue = payments
    .filter((p) => p.status === 'SUCCESS' || p.status === 'COMPLETED' || p.status === 'COUNTER_PAYMENT_COLLECTED')
    .reduce((acc, p) => acc + Number(p.amount || 0), 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] tracking-tight flex items-center gap-2">
            <CreditCard className="text-[#0E7490]" size={20} strokeWidth={2} />
            Platform Payments & Revenue Ledger
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Real-time ledger of Razorpay transactions and on-counter cash settlements across all print shops.
          </p>
        </div>

        <button
          onClick={loadPayments}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Settled Volume
            </span>
            <div className="text-xl font-bold text-green-600 mt-0.5">
              ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Total Transactions
            </span>
            <div className="text-xl font-bold text-[var(--text)] mt-0.5">{payments.length}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#0E7490]/10 text-[#0E7490] flex items-center justify-center">
            <CreditCard size={18} />
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Gateway Provider
            </span>
            <div className="text-xl font-bold text-[var(--text)] mt-0.5">Razorpay + Counter</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={(e) => { e.preventDefault(); loadPayments(); }} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={14} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search payment ID, order ID, gateway ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-9 text-xs"
          />
        </form>

        <div className="flex items-center gap-1 w-full sm:w-auto">
          {['ALL', 'SUCCESS', 'PENDING', 'FAILED'].map((st) => (
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

      {/* Payments Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-hover)] text-[var(--text-muted)] border-b border-[var(--border)] uppercase tracking-wider text-[11px] font-semibold sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Transaction Ref</th>
                <th className="py-2.5 px-4">Tenant Shop</th>
                <th className="py-2.5 px-4">Order #</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Method</th>
                <th className="py-2.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[var(--text-muted)]">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-12">
                    <td className="py-2.5 px-4 font-mono font-medium text-xs text-[#0E7490]">
                      {p.gatewayPaymentId || p.paymentRef || `TXN-${p.id}`}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-semibold text-[var(--text)]">
                      {p.order?.shop?.name || 'Unassigned'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs">
                      #{p.order?.orderNumber || p.orderId}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[var(--text-muted)]">
                      {p.order?.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-xs text-[var(--text)]">
                      ₹{Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          p.status === 'SUCCESS' || p.status === 'COMPLETED'
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : p.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono text-[var(--text-muted)]">
                      {p.paymentMethod || 'RAZORPAY'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[11px] text-[var(--text-muted)] font-mono whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleString()}
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
