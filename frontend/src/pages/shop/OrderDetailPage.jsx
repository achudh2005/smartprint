import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, Printer, CheckCircle2, XCircle, AlertTriangle,
  Download, Eye, Clock, ShieldCheck, User, Copy, Check, X,
  Layers, ChevronRight, RefreshCw, AlertCircle, Trash2, CreditCard, Banknote,
  PlusCircle, Flame, History
} from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, Button, Spinner, Badge, Alert } from '../../components/ui'
import ShopNavTabs from '../../components/shop/ShopNavTabs'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function OrderDetailPage() {
  const { shopId, orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [printingFileId, setPrintingFileId] = useState(null)
  const [downloadingFileId, setDownloadingFileId] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [counterPayModalOpen, setCounterPayModalOpen] = useState(false)
  const [counterAmount, setCounterAmount] = useState('')
  const [counterMethod, setCounterMethod] = useState('CASH')
  const [counterNotes, setCounterNotes] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [expiryActionLoading, setExpiryActionLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [isExpired, setIsExpired] = useState(false)

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/shops/${shopId}/orders/${orderId}`)
      const ord = data.data.order
      setOrder(ord)
      setCounterAmount(ord.totalAmount?.toString() || '0')
    } catch (err) {
      toast.error('Failed to load order details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [shopId, orderId])

  // Expiration countdown
  useEffect(() => {
    if (!order?.expiresAt) return

    const updateTimer = () => {
      const diff = new Date(order.expiresAt).getTime() - Date.now()
      if (diff <= 0 || order.status === 'EXPIRED') {
        setTimeLeft('Expired & Files Purged')
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
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [order?.expiresAt, order?.status])

  // Fetch preview blob when a file is selected for preview
  useEffect(() => {
    if (!previewFile) {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl)
        setPreviewBlobUrl(null)
      }
      return
    }

    let active = true
    setPreviewLoading(true)

    const fetchPreview = async () => {
      try {
        const fileId = previewFile.publicId || previewFile.id
        const token = localStorage.getItem('accessToken') || ''
        const res = await api.get(`/shops/${shopId}/files/${fileId}/preview`, {
          params: { token },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          responseType: 'blob',
        })
        if (active) {
          const contentType = (res.headers?.['content-type'] || res.data?.type || '').toLowerCase()
          if (contentType.includes('application/json')) {
            const text = await res.data.text()
            let errMessage = 'Unable to stream file preview.'
            try {
              const json = JSON.parse(text)
              errMessage = json.message || errMessage
            } catch (_) {
              errMessage = text || errMessage
            }
            throw new Error(errMessage)
          }

          const blobUrl = window.URL.createObjectURL(
            new Blob([res.data], { type: previewFile.mimeType || 'application/pdf' })
          )
          setPreviewBlobUrl(blobUrl)
        }
      } catch (err) {
        console.error('Failed to load blob preview:', err)
        let errMsg = err.message || 'Unable to stream file preview.'
        if (err.response?.data instanceof Blob) {
          try {
            const text = await err.response.data.text()
            const json = JSON.parse(text)
            errMsg = json.message || errMsg
          } catch (_) {}
        }
        if (active) {
          setPreviewBlobUrl(null)
          toast.error(errMsg)
        }
      } finally {
        if (active) setPreviewLoading(false)
      }
    }

    fetchPreview()

    return () => {
      active = false
    }
  }, [previewFile, shopId])

  const handleUpdateStatus = async (newStatus, reason = '') => {
    try {
      setUpdatingStatus(true)
      await api.patch(`/shops/${shopId}/orders/${orderId}/status`, {
        status: newStatus,
        reason,
      })
      toast.success(`Order moved to ${newStatus}`)
      setRejectModalOpen(false)
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleRecordPrintJob = async (fileId, hasPrintedBefore) => {
    if (isExpired) {
      toast.error('Cannot print: Document has expired and been securely deleted from storage.')
      return
    }

    if (hasPrintedBefore) {
      const confirmed = window.confirm('Warning: This file was already printed. Do you want to record another reprint attempt?')
      if (!confirmed) return
    }

    try {
      setPrintingFileId(fileId)
      const { data } = await api.post(`/shops/${shopId}/orders/${orderId}/files/${fileId}/print-job`)
      if (data.data.warning) {
        toast(data.data.warning, { icon: '⚠️' })
      } else {
        toast.success('Print attempt recorded!')
      }
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record print job.')
    } finally {
      setPrintingFileId(null)
    }
  }

  const handleDownloadFile = async (file) => {
    try {
      setDownloadingFileId(file.id)
      const fileId = file.publicId || file.id
      const token = localStorage.getItem('accessToken') || ''
      const res = await api.get(`/shops/${shopId}/files/${fileId}/download`, {
        params: { token },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob',
      })
      const contentType = (res.headers?.['content-type'] || res.data?.type || '').toLowerCase()
      if (contentType.includes('application/json')) {
        const text = await res.data.text()
        let errMessage = 'File download failed.'
        try {
          const json = JSON.parse(text)
          errMessage = json.message || errMessage
        } catch (_) {
          errMessage = text || errMessage
        }
        throw new Error(errMessage)
      }
      const blob = new Blob([res.data], { type: file.mimeType || 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.originalName || `document_${file.id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch (err) {
      console.error('Download failed:', err)
      let errMsg = err.message || 'Failed to download file.'
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const json = JSON.parse(text)
          errMsg = json.message || errMsg
        } catch (_) {}
      }
      toast.error(errMsg)
    } finally {
      setDownloadingFileId(null)
    }
  }

  // Extend Expiry
  const handleExtendExpiry = async (minutes) => {
    try {
      setExpiryActionLoading(true)
      await api.post(`/shops/${shopId}/orders/${orderId}/expiry/extend`, {
        additionalMinutes: minutes,
      })
      toast.success(`Expiry extended by +${minutes} minutes!`)
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to extend expiry.')
    } finally {
      setExpiryActionLoading(false)
    }
  }

  // Purge Files Immediately (Owner Manual Deletion)
  const handlePurgeFilesNow = async () => {
    const confirmed = window.confirm(
      '⚠️ Immediate Deletion Confirmation:\n\nAre you sure you want to permanently delete all uploaded files and generated previews for this order?\n\nThis action cannot be undone.'
    )
    if (!confirmed) return

    try {
      setExpiryActionLoading(true)
      await api.delete(`/shops/${shopId}/orders/${orderId}/files/purge`)
      toast.success('Documents permanently deleted from storage.')
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to purge documents.')
    } finally {
      setExpiryActionLoading(false)
    }
  }

  // Record Counter Payment
  const handleRecordCounterPayment = async (e) => {
    e.preventDefault()
    try {
      setProcessingPayment(true)
      await api.post(`/shops/${shopId}/orders/${orderId}/counter-payment`, {
        amount: parseFloat(counterAmount),
        method: counterMethod,
        notes: counterNotes,
      })
      toast.success('Counter payment recorded!')
      setCounterPayModalOpen(false)
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record counter payment.')
    } finally {
      setProcessingPayment(false)
    }
  }

  const copyOrderNumber = () => {
    if (!order?.orderNumber) return
    navigator.clipboard.writeText(order.orderNumber)
    setCopied(true)
    toast.success('Order Number copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const formatBytes = (bytes) => {
    if (!bytes || bytes === '0') return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(Number(bytes)) / Math.log(k))
    return parseFloat((Number(bytes) / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-600 font-medium">Order not found.</p>
        <Link to={`/shops/${shopId}/orders`} className="text-primary-600 text-sm mt-2 inline-block">
          Return to Orders
        </Link>
      </div>
    )
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case 'CONFIRMED':
      case 'ACCEPTED':
        return 'blue'
      case 'PRINTING':
      case 'PROCESSING':
        return 'purple'
      case 'PRINTED':
      case 'READY':
        return 'teal'
      case 'COLLECTED':
      case 'COMPLETED':
        return 'green'
      case 'PAYMENT_PENDING':
        return 'yellow'
      case 'REJECTED':
      case 'CANCELLED':
        return 'red'
      case 'EXPIRED':
        return 'gray'
      default:
        return 'gray'
    }
  }

  const latestPayment = order.payments?.[0]

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb & Top Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/shops/${shopId}/orders`}
            className="p-2 rounded-xl bg-white border border-surface-200 text-slate-600 hover:text-slate-900 shadow-xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Order #{order.orderNumber}</h1>
            <p className="text-xs text-slate-500">
              Placed {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === 'CONFIRMED' || order.status === 'PENDING' ? (
            <>
              <Button
                variant="primary"
                size="sm"
                loading={updatingStatus}
                onClick={() => handleUpdateStatus('ACCEPTED', 'Order accepted by operator')}
              >
                <CheckCircle2 size={15} /> Accept Order
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRejectModalOpen(true)}
                className="text-red-600 hover:bg-red-50 border-red-200"
              >
                <XCircle size={15} /> Reject
              </Button>
            </>
          ) : order.status === 'ACCEPTED' ? (
            <Button
              variant="primary"
              size="sm"
              loading={updatingStatus}
              onClick={() => handleUpdateStatus('PRINTING', 'Print production started')}
            >
              <Printer size={15} /> Start Printing
            </Button>
          ) : order.status === 'PRINTING' || order.status === 'PROCESSING' ? (
            <Button
              variant="primary"
              size="sm"
              loading={updatingStatus}
              onClick={() => handleUpdateStatus('PRINTED', 'All documents printed successfully')}
            >
              <CheckCircle2 size={15} /> Mark as Printed
            </Button>
          ) : order.status === 'PRINTED' || order.status === 'READY' ? (
            <Button
              variant="primary"
              size="sm"
              loading={updatingStatus}
              onClick={() => handleUpdateStatus('COLLECTED', 'Customer collected print order')}
            >
              <CheckCircle2 size={15} /> Mark as Collected
            </Button>
          ) : null}

          {/* Record Counter Payment button */}
          {latestPayment?.status !== 'SUCCESS' && latestPayment?.status !== 'COUNTER_PAYMENT_COLLECTED' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCounterPayModalOpen(true)}
              className="text-emerald-700 hover:bg-emerald-50 border-emerald-300"
            >
              <CreditCard size={15} /> Record Payment
            </Button>
          )}

          {/* Cancel button if not terminal */}
          {!['COLLECTED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(order.status) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this order?')) {
                  handleUpdateStatus('CANCELLED', 'Order cancelled by shop staff')
                }
              }}
              className="text-red-600 hover:bg-red-50"
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      <ShopNavTabs shopId={shopId} />

      {/* ── Order Header Summary ── */}
      <Card>
        <CardBody className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-black text-slate-900 tracking-wider">
                {order.orderNumber}
              </span>
              <button
                type="button"
                onClick={copyOrderNumber}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-surface-100"
                title="Copy order number"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </button>
              <Badge variant={getStatusVariant(order.status)} size="md">
                {order.status}
              </Badge>
            </div>

            {/* Prominent Customer Identification Tag */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-primary-50/80 border border-primary-200/90 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <User size={13} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {order.session?.customerName || order.customerName || 'Anonymous Visitor'}
                </span>
                {(order.session?.customerPhone || order.customerPhone) && (
                  <span className="font-mono text-primary-700 font-semibold bg-white px-2 py-0.5 rounded-md border border-primary-200">
                    📞 {order.session?.customerPhone || order.customerPhone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>Submitted: {new Date(order.createdAt).toLocaleString()}</span>
              <span>•</span>
              <span>Total Documents: {order.orderFiles?.length || 0}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">Total Pages: {order.totalPages}</span>
            </div>
          </div>

          <div className="text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0 w-full md:w-auto border-surface-100">
            <span className="text-xs text-slate-400 block">Total Amount</span>
            <span className="text-3xl font-black text-slate-900">
              ₹ {order.totalAmount?.toFixed(2)}
            </span>
          </div>
        </CardBody>
      </Card>

      {/* ── Owner Expiry & Data Privacy Controls ── */}
      <Card className={`border ${isExpired ? 'bg-rose-50/60 border-rose-200' : 'bg-amber-50/40 border-amber-200/80'}`}>
        <CardBody className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${isExpired ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Document Lifetime & Privacy Retention</h3>
                <Badge variant={isExpired ? 'red' : 'yellow'} size="sm">
                  {isExpired ? 'EXPIRED' : 'ACTIVE RETENTION'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isExpired
                  ? 'All uploaded documents for this order have been securely unlinked and deleted from disk.'
                  : `Remaining storage window: `}
                {!isExpired && (
                  <span className="font-mono font-bold text-amber-900">{timeLeft}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isExpired && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={expiryActionLoading}
                  onClick={() => handleExtendExpiry(60)}
                  className="bg-white"
                >
                  <Clock size={14} /> +1h Expiry
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={expiryActionLoading}
                  onClick={() => handleExtendExpiry(180)}
                  className="bg-white"
                >
                  <Clock size={14} /> +3h Expiry
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={expiryActionLoading}
                  onClick={handlePurgeFilesNow}
                  className="bg-white text-rose-700 hover:bg-rose-50 border-rose-300"
                >
                  <Trash2 size={14} /> Purge Files Now
                </Button>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ── Payment Details & Method Banner ── */}
      <Card className="border border-surface-200">
        <CardBody className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-2xl shrink-0 ${
              latestPayment?.status === 'SUCCESS' || latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED'
                ? 'bg-emerald-100 text-emerald-700'
                : latestPayment?.method === 'COUNTER' || latestPayment?.status === 'COUNTER_PAYMENT_DUE'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {latestPayment?.method === 'COUNTER' || latestPayment?.status === 'COUNTER_PAYMENT_DUE' || latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED' ? (
                <Banknote size={22} />
              ) : (
                <CreditCard size={22} />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Payment Details</h3>

                {/* Clear Payment Method Pill */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  latestPayment?.method === 'COUNTER' || latestPayment?.status === 'COUNTER_PAYMENT_DUE' || latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {latestPayment?.method === 'COUNTER' || latestPayment?.status === 'COUNTER_PAYMENT_DUE' || latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED'
                    ? '🏪 Pay at Counter'
                    : '💳 Paid Online (Razorpay)'}
                </span>

                {/* Status Badge */}
                <Badge
                  variant={
                    latestPayment?.status === 'SUCCESS' || latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED'
                      ? 'green'
                      : latestPayment?.status === 'FAILED'
                      ? 'red'
                      : 'yellow'
                  }
                  size="sm"
                >
                  {latestPayment?.status === 'COUNTER_PAYMENT_DUE'
                    ? 'COLLECT AT COUNTER'
                    : latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED'
                    ? 'PAID AT COUNTER'
                    : latestPayment?.status === 'SUCCESS'
                    ? 'PAID IN ADVANCE'
                    : (latestPayment?.status || 'PENDING')}
                </Badge>
              </div>

              {/* Informative description for the shop owner */}
              <p className="text-xs text-slate-600">
                {latestPayment?.status === 'COUNTER_PAYMENT_DUE' ? (
                  <span className="text-amber-800 font-medium">
                    Customer selected <strong>Pay at Counter</strong>. Please collect ₹{Number(order.totalAmount).toFixed(2)} when the customer picks up their print job.
                  </span>
                ) : latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED' ? (
                  <span className="text-emerald-800 font-medium">
                    Payment collected at counter by operator.
                  </span>
                ) : latestPayment?.status === 'SUCCESS' ? (
                  <span className="text-emerald-800 font-medium">
                    Customer already paid online via UPI / Card. No payment collection needed at pickup.
                  </span>
                ) : (
                  <span>Customer selected online payment (awaiting confirmation or counter payment).</span>
                )}
              </p>

              {(latestPayment?.referenceId || latestPayment?.razorpayPaymentId || latestPayment?.paidAt) && (
                <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400 font-mono pt-0.5">
                  {(latestPayment.razorpayPaymentId || latestPayment.referenceId) && (
                    <span>Ref: {latestPayment.razorpayPaymentId || latestPayment.referenceId}</span>
                  )}
                  {latestPayment.paidAt && (
                    <span>Paid at: {new Date(latestPayment.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="text-left md:text-right shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-surface-100">
            <span className="text-xs text-slate-400 block font-medium">Order Total</span>
            <span className="text-2xl font-black text-slate-900">
              ₹ {Number(latestPayment?.amount || order.totalAmount).toFixed(2)}
            </span>
            {latestPayment?.status === 'COUNTER_PAYMENT_DUE' && (
              <span className="inline-block text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">
                To Collect: ₹{Number(order.totalAmount).toFixed(2)}
              </span>
            )}
            {latestPayment?.status === 'SUCCESS' && (
              <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
                ✓ Fully Paid
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Customer Note */}
      {order.notes && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Customer Instructions</h4>
            <p className="text-xs text-amber-800 mt-0.5 italic">"{order.notes}"</p>
          </div>
        </div>
      )}

      {/* ── Uploaded Documents & Individual Settings ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Uploaded Documents ({order.orderFiles?.length || 0})
          </h2>
          <span className="text-xs text-slate-500">Each document has independent print settings</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {order.orderFiles?.map((file, idx) => {
            const cfg = file.printConfiguration || {}
            const hasPrinted = file.hasPrintedBefore || file.status === 'PRINTED'
            const filePurged = file.isPurged || isExpired

            return (
              <Card key={file.id} className="overflow-hidden">
                <CardBody className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-100 text-slate-600 flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{file.originalName}</h3>
                          <Badge variant={filePurged ? 'red' : file.status === 'PRINTED' ? 'green' : 'gray'}>
                            {filePurged ? 'PURGED' : file.status}
                          </Badge>
                          {file.printJobsCount > 0 && (
                            <Badge variant="yellow" size="sm">
                              {file.printJobsCount} {file.printJobsCount === 1 ? 'print' : 'prints'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatBytes(file.fileSizeBytes)} • {file.pageCount || 1} pages
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {!filePurged ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setPreviewFile(file)}
                          >
                            <Eye size={14} /> Preview
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={downloadingFileId === file.id}
                            onClick={() => handleDownloadFile(file)}
                          >
                            <Download size={14} /> Download
                          </Button>
                          <Button
                            variant={hasPrinted ? 'secondary' : 'primary'}
                            size="sm"
                            loading={printingFileId === file.id}
                            onClick={() => handleRecordPrintJob(file.id, hasPrinted)}
                            className={hasPrinted ? 'border-amber-300 text-amber-800 hover:bg-amber-50' : ''}
                          >
                            <Printer size={14} /> {hasPrinted ? 'Reprint File' : 'Mark Printed'}
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                          <Trash2 size={13} /> Purged from disk
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Print Configuration Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-50 p-3.5 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Color Mode</span>
                      <span className="font-semibold text-slate-800">{cfg.colorMode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Paper Size & Type</span>
                      <span className="font-semibold text-slate-800">{cfg.paperSize} ({cfg.paperType || 'NORMAL'})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Sides & Layout</span>
                      <span className="font-semibold text-slate-800">
                        {cfg.duplexMode?.includes('DUPLEX') ? '2-Sided (Duplex)' : '1-Sided (Simplex)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Copies & Pages</span>
                      <span className="font-semibold text-slate-800">
                        {cfg.copies || 1} {cfg.copies === 1 ? 'copy' : 'copies'} ({cfg.pageRange || 'All pages'})
                      </span>
                    </div>
                  </div>

                  {/* Additional Finishing Services */}
                  {file.orderFileServices && file.orderFileServices.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-slate-400 font-medium">Services:</span>
                      {file.orderFileServices.map((ofs) => (
                        <Badge key={ofs.id} variant="blue" size="sm">
                          {ofs.additionalService?.name || 'Service'} (Qty: {ofs.quantity})
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ── Expiry & Privacy Audit Logs ── */}
      {order.expiryLogs && order.expiryLogs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History size={16} className="text-primary-600" />
              <h3 className="font-semibold text-slate-800 text-sm">File Expiry & Purge Audit Trail</h3>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-surface-100 text-xs">
              {order.expiryLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.action === 'EXTENDED' ? 'blue' : log.action === 'IMMEDIATE_DELETION' ? 'red' : 'gray'}>
                        {log.action}
                      </Badge>
                      <span className="font-medium text-slate-700">{log.reason || 'Status update'}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()} • Staff ID: {log.performedBy || 'System/Worker'}
                    </p>
                  </div>
                  {log.bytesFreed && log.bytesFreed !== '0' && (
                    <span className="text-emerald-700 font-mono font-semibold">
                      +{formatBytes(log.bytesFreed)} freed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Order Status History Trail ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Order Status Audit Trail</h3>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-surface-100 text-xs">
            {order.statusLogs?.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{log.fromStatus || 'INIT'}</span>
                    <ChevronRight size={13} className="text-slate-400" />
                    <Badge variant={getStatusVariant(log.toStatus)} size="sm">
                      {log.toStatus}
                    </Badge>
                  </div>
                  <p className="text-slate-500">{log.note || 'No comment recorded'}</p>
                </div>
                <div className="text-right text-slate-400 text-[11px]">
                  <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                  <div>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ── Document Preview Modal ── */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-surface-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary-600" />
                <h3 className="font-semibold text-slate-900 text-sm truncate max-w-md">
                  {previewFile.originalName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={downloadingFileId === previewFile.id}
                  onClick={() => handleDownloadFile(previewFile)}
                >
                  <Download size={14} /> Download
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!previewBlobUrl}
                  onClick={() => previewBlobUrl && window.open(previewBlobUrl, '_blank')}
                >
                  <Printer size={14} /> Open to Print
                </Button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-surface-100 ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-surface-100 p-4 overflow-auto flex items-center justify-center min-h-[450px]">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-2 text-slate-500 py-16">
                  <Spinner size="lg" />
                  <span className="text-xs font-medium">Loading document preview...</span>
                </div>
              ) : previewBlobUrl ? (
                previewFile.mimeType === 'application/pdf' ? (
                  <iframe
                    src={previewBlobUrl}
                    title={previewFile.originalName}
                    className="w-full h-[650px] border-0 rounded-lg bg-white shadow-xs"
                  />
                ) : previewFile.mimeType?.startsWith('image/') ? (
                  <img
                    src={previewBlobUrl}
                    alt={previewFile.originalName}
                    className="max-h-[600px] max-w-full object-contain rounded-lg shadow-xs"
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText size={48} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">{previewFile.originalName}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Native browser preview is not available for this format. Use the download button to inspect on your PC.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-3"
                      loading={downloadingFileId === previewFile.id}
                      onClick={() => handleDownloadFile(previewFile)}
                    >
                      <Download size={14} /> Download File
                    </Button>
                  </div>
                )
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <AlertCircle size={40} className="text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">Preview Unavailable</p>
                  <p className="text-xs text-slate-400 mt-1 mb-3">Unable to stream document preview.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={downloadingFileId === previewFile.id}
                    onClick={() => handleDownloadFile(previewFile)}
                  >
                    <Download size={14} /> Download Instead
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Counter Payment Modal ── */}
      {counterPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Record Counter Payment</h3>
              <button
                onClick={() => setCounterPayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordCounterPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount Collected (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="input text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={counterMethod}
                  onChange={(e) => setCounterMethod(e.target.value)}
                  className="input text-xs"
                >
                  <option value="CASH">Cash at Counter</option>
                  <option value="UPI">Store UPI / QR Scanner</option>
                  <option value="CARD">Card POS Terminal</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Receipt / Staff Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash, receipt #1042"
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setCounterPayModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={processingPayment}>
                  Confirm Collection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Reject Print Order</h3>
            <p className="text-xs text-slate-500">
              Please enter a reason for rejecting this print order (e.g. unreadable font, corrupted document, paper out of stock):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="input text-xs"
              required
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => handleUpdateStatus('REJECTED', rejectReason || 'Order rejected by staff')}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
