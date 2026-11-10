import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CreditCard, DollarSign, ArrowUpRight, AlertCircle, CheckCircle2,
  Clock, RefreshCw, Search, Filter, ShieldCheck, Wallet, ArrowDownRight
} from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, Button, Spinner, Badge } from '../../components/ui'
import ShopNavTabs from '../../components/shop/ShopNavTabs'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function ShopPaymentsPage() {
  const { shopId } = useParams()
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    onlineRevenue: 0,
    counterRevenue: 0,
    failedCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: 15,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        method: methodFilter !== 'ALL' ? methodFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }

      const { data } = await api.get(`/shops/${shopId}/payments`, { params })
      if (data.success) {
        setPayments(data.data.payments)
        setStats(data.data.stats || {})
        setTotalPages(data.data.pagination.totalPages)
        setTotalCount(data.data.pagination.total)
      }
    } catch (err) {
      toast.error('Failed to load payments.')
    } finally {
      setLoading(false)
    }
  }, [shopId, page, statusFilter, methodFilter, startDate, endDate])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
      case 'COMPLETED':
        return <Badge variant="green">Online Success</Badge>
      case 'COUNTER_PAYMENT_COLLECTED':
        return <Badge variant="green">Counter Collected</Badge>
      case 'COUNTER_PAYMENT_DUE':
        return <Badge variant="yellow">Counter Due</Badge>
      case 'PENDING':
        return <Badge variant="yellow">Pending</Badge>
      case 'FAILED':
        return <Badge variant="red">Failed Attempt</Badge>
      case 'REFUNDED':
        return <Badge variant="purple">Refunded</Badge>
      default:
        return <Badge variant="gray">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight">Payments &amp; Revenue</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Supervise online gateway transactions, counter collections, and audit logs.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchPayments} className="self-start sm:self-auto">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <ShopNavTabs shopId={shopId} />

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[var(--surface)]">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-black text-[var(--text)] mt-1 tabular-nums">
                ₹ {Number(stats.totalRevenue || 0).toFixed(2)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
              <DollarSign size={18} />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-[var(--surface)]">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Online (Razorpay)</p>
              <p className="text-2xl font-black text-indigo-600 mt-1 tabular-nums">
                ₹ {Number(stats.onlineRevenue || 0).toFixed(2)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
              <CreditCard size={18} />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-[var(--surface)]">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Counter Cash/UPI</p>
              <p className="text-2xl font-black text-teal-600 mt-1 tabular-nums">
                ₹ {Number(stats.counterRevenue || 0).toFixed(2)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
              <Wallet size={18} />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-[var(--surface)]">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Failed Attempts</p>
              <p className="text-2xl font-black text-rose-600 mt-1 tabular-nums">
                {stats.failedCount || 0}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
              <AlertCircle size={18} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 flex flex-wrap items-end gap-4 text-xs">
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="input py-1.5 px-3 text-xs font-medium bg-[var(--surface)]"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Online Success</option>
            <option value="COUNTER_PAYMENT_COLLECTED">Counter Collected</option>
            <option value="COUNTER_PAYMENT_DUE">Counter Due</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Method</label>
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value)
              setPage(1)
            }}
            className="input py-1.5 px-3 text-xs font-medium bg-[var(--surface)]"
          >
            <option value="ALL">All Methods</option>
            <option value="RAZORPAY">Razorpay</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="COUNTER">Counter</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setPage(1)
            }}
            className="input py-1.5 px-2 text-xs"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setPage(1)
            }}
            className="input py-1.5 px-2 text-xs"
          />
        </div>

        {(statusFilter !== 'ALL' || methodFilter !== 'ALL' || startDate || endDate) && (
          <div className="self-end pb-0.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL')
                setMethodFilter('ALL')
                setStartDate('')
                setEndDate('')
                setPage(1)
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* ── Payments Table ── */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text)] text-sm">
              Transactions &amp; Records ({totalCount})
            </h3>
            <span className="text-xs text-[var(--text-muted)] font-mono">Real-time DB Ledger</span>
          </div>
        </CardHeader>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-20 text-center">
            <CreditCard size={28} strokeWidth={1.5} className="text-[var(--border)] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[var(--text)]">No payment records found</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">There are no transactions matching your active filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-hover)] text-[var(--text-muted)] font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference / Txn ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150">
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#0E7490]">
                      <Link to={`/shops/${shopId}/orders/${p.order?.id}`}>
                        {p.order?.orderNumber || `Order #${p.orderId}`}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[var(--text)] tabular-nums">
                      ₹ {Number(p.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium text-[var(--text)]">{p.method}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[var(--text-muted)] max-w-[180px] truncate">
                      {p.razorpayPaymentId || p.referenceId || p.razorpayOrderId || '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-muted)]">
                      <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Link
                        to={`/shops/${shopId}/orders/${p.order?.id}`}
                        className="text-[#0E7490] font-medium hover:text-[#155E75] text-xs"
                      >
                        Inspect Order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">
              Page <span className="font-semibold text-[var(--text)]">{page}</span> of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
