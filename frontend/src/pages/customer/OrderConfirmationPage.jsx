import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle2, Clock, Printer, Store, MapPin, Phone,
  FileText, Copy, Check, ArrowLeft, RefreshCw, AlertCircle,
  CreditCard, ShieldCheck, Flame, Info
} from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Badge, Spinner, Alert, ThemeToggle } from '../../components/ui'
import api from '../../lib/api'
import { openRazorpayCheckout } from '../../lib/razorpay'
import toast from 'react-hot-toast'

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [isExpired, setIsExpired] = useState(false)

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/customer/orders/${orderNumber}`)
      if (data?.data) {
        setOrder(data.data)
        setError('')
      } else {
        setError('Order not found or has expired.')
      }
    } catch (err) {
      const msg = err.response?.data?.message
      if (msg && !msg.toLowerCase().includes('cannot read') && !msg.toLowerCase().includes('undefined') && !msg.toLowerCase().includes('map')) {
        setError(msg)
      } else {
        setError('Order not found or has expired. Please verify your order number or token.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 15000)
    return () => clearInterval(interval)
  }, [orderNumber])

  // Safe price formatting
  const formatPrice = (val) => {
    const num = Number(val)
    return isNaN(num) ? '0.00' : num.toFixed(2)
  }

  // Live countdown timer for order expiration
  useEffect(() => {
    if (!order?.expiresAt) return

    const updateTimer = () => {
      const diff = new Date(order.expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Expired & Purged')
        setIsExpired(true)
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(
          hours > 0
            ? `${hours}h ${minutes}m ${seconds}s`
            : `${minutes}m ${seconds}s`
        )
        setIsExpired(false)
      }
    }

    updateTimer()
    const tInterval = setInterval(updateTimer, 1000)
    return () => clearInterval(tInterval)
  }, [order?.expiresAt])

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber)
    setCopied(true)
    toast.success('Order Number copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePayNow = async () => {
    try {
      setPaying(true)
      const rzpRes = await api.post('/payments/razorpay/order', {
        orderId: order.orderNumber,
      })
      const rzpData = rzpRes.data.data

      await openRazorpayCheckout({
        keyId: rzpData.keyId,
        amount: rzpData.amount,
        currency: rzpData.currency,
        razorpayOrderId: rzpData.razorpayOrderId,
        orderNumber: order.orderNumber,
        onSuccess: async (rzpResponse) => {
          try {
            await api.post('/payments/razorpay/verify', {
              orderId: order.orderNumber,
              razorpayOrderId: rzpResponse.razorpay_order_id,
              razorpayPaymentId: rzpResponse.razorpay_payment_id,
              razorpaySignature: rzpResponse.razorpay_signature,
            })
            toast.success('Payment verified successfully!')
            fetchOrder()
          } catch (vErr) {
            toast.error('Payment verification failed.')
          }
        },
        onDismiss: () => {
          toast('Payment cancelled.', { icon: 'ℹ️' })
        },
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initialization failed.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="max-w-md w-full bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] text-center shadow-xs">
          <AlertCircle size={36} strokeWidth={1.75} className="text-red-500 mx-auto mb-3" />
          <h1 className="text-base font-semibold text-[var(--text)] mb-2">Order Not Found</h1>
          <p className="text-xs text-[var(--text-muted)] mb-6">{error || 'Please verify your order number.'}</p>
          <Link to="/">
            <Button variant="primary" className="min-h-[44px]">Return Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const steps = [
    { key: 'CONFIRMED', label: 'Order Placed' },
    { key: 'PRINTING', label: 'Printing' },
    { key: 'PRINTED', label: 'Printed' },
    { key: 'READY', label: 'Ready' },
    { key: 'COLLECTED', label: 'Collected' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === order.status)
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] py-6 sm:py-10 px-4 transition-colors duration-150">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top bar with back and ThemeToggle */}
        <div className="flex items-center justify-between pb-1">
          <Link
            to={`/s/${order.shop?.shopCode || ''}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] min-h-[44px] items-center"
          >
            <ArrowLeft size={14} strokeWidth={1.75} /> Back to Shop
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              to="/about"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] hover:text-[var(--text)] border border-[var(--border)] transition-colors min-h-[36px]"
              title="About SmartPrint"
            >
              <Info size={13} strokeWidth={1.75} className="text-[#0E7490] shrink-0" />
              <span>About</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Success Banner */}
        <div className="bg-[var(--surface)] rounded-xl p-6 sm:p-8 text-center border border-[var(--border)] shadow-xs space-y-4">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto border border-green-200 dark:border-green-900/50">
            <CheckCircle2 size={24} strokeWidth={1.75} />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text)]">Print Request Confirmed</h1>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
              Show this token number at the print shop counter when collecting your printed sheets.
            </p>
          </div>

          {/* Order Number Token */}
          <div
            className="inline-flex items-center gap-3 bg-[var(--surface-hover)] hover:bg-[var(--border)] transition-colors px-4 py-2.5 rounded-lg border border-[var(--border)] cursor-pointer min-h-[44px]"
            onClick={copyOrderNumber}
            title="Click to copy order number"
          >
            <span className="font-mono text-lg sm:text-xl font-bold text-[var(--text)] tracking-wider tabular-nums">
              {order.orderNumber}
            </span>
            <button type="button" aria-label="Copy order number" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              {copied ? <Check size={16} strokeWidth={2} className="text-green-600" /> : <Copy size={16} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {/* File Privacy & Expiration Countdown */}
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
          isExpired
            ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text)]'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              isExpired
                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 border-rose-200 dark:border-rose-800'
                : 'bg-[var(--accent-tint)] text-[#0E7490] dark:text-[#22D3EE] border-[var(--border)]'
            }`}>
              <Clock size={15} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Data Privacy Lifetime
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                {isExpired
                  ? 'Uploaded documents have been permanently unlinked and deleted.'
                  : 'Files are auto-purged from storage to protect your privacy.'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`font-mono text-xs sm:text-sm font-semibold tabular-nums ${
              isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-[#0E7490] dark:text-[#22D3EE]'
            }`}>
              {timeLeft}
            </span>
          </div>
        </div>

        {/* Payment Information Card */}
        <Card>
          <CardBody className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard size={15} strokeWidth={1.75} className="text-[#0E7490]" />
                <h3 className="font-semibold text-[var(--text)] text-sm">Payment Status</h3>
                {order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'COMPLETED' ? (
                  <Badge variant="green" dot>Online Paid</Badge>
                ) : order.paymentStatus === 'COUNTER_PAYMENT_COLLECTED' ? (
                  <Badge variant="green" dot>Paid at Counter</Badge>
                ) : order.paymentStatus === 'COUNTER_PAYMENT_DUE' ? (
                  <Badge variant="yellow" dot>Pay at Counter</Badge>
                ) : (
                  <Badge variant="yellow" dot>Payment Pending</Badge>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'COMPLETED'
                  ? 'Payment successfully verified online via Razorpay.'
                  : order.paymentStatus === 'COUNTER_PAYMENT_COLLECTED'
                  ? 'Payment collected and recorded at shop counter.'
                  : order.paymentStatus === 'COUNTER_PAYMENT_DUE'
                  ? 'Please pay the shopkeeper at the counter when collecting your prints.'
                  : 'Complete online payment via UPI, Card, or Netbanking.'}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--border)]">
              <div className="text-left sm:text-right">
                <span className="text-[11px] text-[var(--text-muted)] block">Total Amount</span>
                <span className="text-lg font-semibold text-[var(--text)] tabular-nums">
                  ₹ {formatPrice(order.totalAmount)}
                </span>
              </div>

              {order.paymentStatus === 'PAYMENT_PENDING' && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={paying}
                  onClick={handlePayNow}
                  className="shrink-0 min-h-[44px]"
                >
                  Pay Now
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Live Status Tracker */}
        <Card>
          <CardBody className="p-5">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5">
              Live Production Tracker
            </h2>
            <div className="grid grid-cols-5 gap-2 relative">
              {steps.map((step, idx) => {
                const isPassed = idx <= activeIndex
                const isCurrent = idx === activeIndex
                return (
                  <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-[#0E7490] text-white ring-2 ring-[#22D3EE]/40'
                          : isPassed
                          ? 'bg-green-600 text-white'
                          : 'bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}
                    >
                      {isPassed && !isCurrent ? <Check size={14} strokeWidth={2} /> : idx + 1}
                    </div>
                    <span className={`text-[11px] sm:text-xs mt-2 font-medium leading-tight ${
                      isCurrent ? 'text-[#0E7490] dark:text-[#22D3EE] font-semibold' : isPassed ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        {/* Shop & Counter Details */}
        <Card>
          <CardBody className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Store size={15} strokeWidth={1.75} className="text-[#0E7490]" />
                <h3 className="font-semibold text-[var(--text)] text-sm">{order.shop?.name || 'Print Shop'}</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <MapPin size={13} strokeWidth={1.75} className="text-[var(--text-muted)] shrink-0" />
                {order.shop?.address || 'In-store Print Counter'}
              </p>
              {order.shop?.contactPhone && (
                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                  <Phone size={13} strokeWidth={1.75} className="text-[var(--text-muted)] shrink-0" />
                  {order.shop.contactPhone}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[var(--text-muted)] block">Total Due</span>
              <span className="text-lg font-semibold text-[var(--text)] tabular-nums">
                ₹ {formatPrice(order.totalAmount)}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Document Details */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-[var(--text)] text-sm">
              Documents in Order ({order.files?.length || 0})
            </h3>
          </CardHeader>
          <CardBody className="p-0 divide-y divide-[var(--border)]">
            {order.files?.map((file) => {
              const cfg = file.printConfiguration || {}
              return (
                <div key={file.publicId} className="p-4 flex items-center justify-between text-xs gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-[var(--text)] text-xs sm:text-sm truncate">{file.originalName}</p>
                    <div className="flex flex-wrap gap-x-2 text-[var(--text-muted)] text-[11px] tabular-nums">
                      <span>{file.pageCount || 1} pages</span>
                      <span>•</span>
                      <span>{cfg.copies || 1} {cfg.copies === 1 ? 'copy' : 'copies'}</span>
                      <span>•</span>
                      <span>{cfg.colorMode === 'COLOR' ? 'Color' : 'B&W'}</span>
                      <span>•</span>
                      <span>{cfg.paperSize || 'A4'}</span>
                      <span>•</span>
                      <span>{cfg.duplexMode?.includes('DUPLEX') ? '2-Sided' : '1-Sided'}</span>
                    </div>
                    {file.services && file.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {file.services.map((s, idx) => (
                          <Badge key={idx} variant="blue" size="sm">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right font-semibold text-[var(--text)] text-xs sm:text-sm tabular-nums shrink-0">
                    ₹ {formatPrice(cfg.calculatedTotal)}
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="secondary" onClick={() => window.print()} className="flex-1 min-h-[44px]">
            <Printer size={15} strokeWidth={1.75} /> Print Receipt
          </Button>

          <Link to={`/s/${order.shop?.shopCode || ''}`} className="flex-1">
            <Button variant="primary" className="w-full min-h-[44px]">
              <ArrowLeft size={15} strokeWidth={1.75} /> Start Another Print
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
