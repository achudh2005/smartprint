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
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-surface-200 text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900 mb-2">Order Not Found</h1>
          <p className="text-sm text-slate-500 mb-6">{error || 'Please verify your order number.'}</p>
          <Link to="/">
            <Button variant="primary">Return Home</Button>
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
    <div className="min-h-screen bg-surface-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-6 sm:py-10 px-4 transition-colors duration-200">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top bar with back and ThemeToggle */}
        <div className="flex items-center justify-between pb-1">
          <Link to={`/s/${order.shop?.shopCode || ''}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft size={14} /> Back to Shop
          </Link>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/about"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 bg-surface-100 hover:bg-surface-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-surface-200 dark:border-slate-700 transition-all shadow-xs active:scale-95"
              title="About SmartPrint"
            >
              <Info size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />
              <span>About</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* ── Success Celebration Banner ── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 text-center border border-surface-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Print Request Confirmed!</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Show this token number at the print shop counter when collecting your printed sheets.
            </p>
          </div>

          {/* Order Number Token */}
          <div className="inline-flex items-center gap-3 bg-surface-100 dark:bg-slate-800 hover:bg-surface-200/80 dark:hover:bg-slate-700/80 transition-colors px-5 py-3 rounded-2xl border border-surface-200 dark:border-slate-700 cursor-pointer" onClick={copyOrderNumber}>
            <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-wider">
              {order.orderNumber}
            </span>
            <button type="button" className="text-slate-400 hover:text-slate-700">
              {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        {/* ── File Privacy & Expiration Countdown Card ── */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isExpired
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-amber-50/80 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isExpired ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Data Privacy Lifetime
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {isExpired
                  ? 'All uploaded documents have been permanently unlinked and deleted.'
                  : 'Files are auto-purged from storage to protect your privacy.'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`font-mono text-sm sm:text-base font-bold ${
              isExpired ? 'text-rose-700' : 'text-amber-800'
            }`}>
              {timeLeft}
            </span>
          </div>
        </div>

        {/* ── Payment Information Card ── */}
        <Card className="border border-surface-200 shadow-xs">
          <CardBody className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-primary-600" />
                <h3 className="font-bold text-slate-900 text-sm">Payment Status</h3>
                {order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'COMPLETED' ? (
                  <Badge variant="green">Online Paid</Badge>
                ) : order.paymentStatus === 'COUNTER_PAYMENT_COLLECTED' ? (
                  <Badge variant="green">Paid at Counter</Badge>
                ) : order.paymentStatus === 'COUNTER_PAYMENT_DUE' ? (
                  <Badge variant="yellow">Pay at Counter</Badge>
                ) : (
                  <Badge variant="yellow">Payment Pending</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'COMPLETED'
                  ? 'Payment successfully verified online via Razorpay.'
                  : order.paymentStatus === 'COUNTER_PAYMENT_COLLECTED'
                  ? 'Payment collected and recorded at shop counter.'
                  : order.paymentStatus === 'COUNTER_PAYMENT_DUE'
                  ? 'Please pay the shop keeper at the counter when collecting your prints.'
                  : 'Complete online payment via UPI, Card, or Netbanking.'}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block">Total Amount</span>
                <span className="text-xl font-bold text-slate-900">
                  ₹ {formatPrice(order.totalAmount)}
                </span>
              </div>

              {order.paymentStatus === 'PAYMENT_PENDING' && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={paying}
                  onClick={handlePayNow}
                  className="shadow-sm shrink-0"
                >
                  Pay Now
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ── Live Status Progression Tracker ── */}
        <Card>
          <CardBody className="p-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">
              Live Production Tracker
            </h2>
            <div className="grid grid-cols-5 gap-2 relative">
              {steps.map((step, idx) => {
                const isPassed = idx <= activeIndex
                const isCurrent = idx === activeIndex
                return (
                  <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                          : isPassed
                          ? 'bg-green-600 text-white'
                          : 'bg-surface-200 text-slate-400'
                      }`}
                    >
                      {isPassed && !isCurrent ? <Check size={16} /> : idx + 1}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-primary-700 font-bold' : isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        {/* ── Shop & Counter Details ── */}
        <Card>
          <CardBody className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Store size={18} className="text-primary-600" />
                <h3 className="font-bold text-slate-900 text-sm">{order.shop?.name || 'Print Shop'}</h3>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                {order.shop?.address || 'In-store Print Counter'}
              </p>
              {order.shop?.contactPhone && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-400 shrink-0" />
                  {order.shop.contactPhone}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Due</span>
              <span className="text-xl font-bold text-slate-900">
                ₹ {formatPrice(order.totalAmount)}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* ── Document Details ── */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800 text-sm">
              Documents in Order ({order.files?.length || 0})
            </h3>
          </CardHeader>
          <CardBody className="p-0 divide-y divide-surface-100">
            {order.files?.map((file) => {
              const cfg = file.printConfiguration || {}
              return (
                <div key={file.publicId} className="p-4 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800 text-sm">{file.originalName}</p>
                    <div className="flex flex-wrap gap-x-3 text-slate-500">
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
                      <div className="flex gap-1.5 pt-1">
                        {file.services.map((s, idx) => (
                          <Badge key={idx} variant="blue" size="sm">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right font-bold text-slate-900 text-sm">
                    ₹ {formatPrice(cfg.calculatedTotal)}
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>

        {/* ── Actions ── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="secondary" onClick={() => window.print()} className="flex-1">
            <Printer size={16} /> Print Receipt
          </Button>

          <Link to={`/s/${order.shop?.shopCode || ''}`} className="flex-1">
            <Button variant="primary" className="w-full">
              <ArrowLeft size={16} /> Start Another Print
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
