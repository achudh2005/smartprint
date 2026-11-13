import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, Printer, CheckCircle2, XCircle, AlertTriangle,
  Download, Eye, Clock, ShieldCheck, User, Copy, Check, X,
  Layers, ChevronRight, RefreshCw, AlertCircle, Trash2, CreditCard, Banknote,
  PlusCircle, Flame, History, Phone, Lock, Edit3 } from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, Button, Spinner, Badge, Alert } from '../../components/ui'
import ShopNavTabs from '../../components/shop/ShopNavTabs'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'
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
  const [printers, setPrinters] = useState([])
  const [selectedPrinterId, setSelectedPrinterId] = useState(null)
  const [printersLoading, setPrintersLoading] = useState(true)
  const [activePrintJobs, setActivePrintJobs] = useState({})
  const [printingAll, setPrintingAll] = useState(false)

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

  const fetchPrinters = async () => {
    try {
      setPrintersLoading(true)
      const { data } = await api.get(`/shops/${shopId}/printers`)
      const list = data.data?.printers || []
      setPrinters(list)
      const def = list.find((p) => p.isDefault) || list[0]
      if (def) setSelectedPrinterId((prev) => prev || def.id)
    } catch (err) {
      console.error('Failed to load printers:', err)
    } finally {
      setPrintersLoading(false)
    }
  }

  const fetchPrintJobs = async () => {
    try {
      const { data } = await api.get(`/shops/${shopId}/print-jobs`, { params: { orderId } })
      const jobs = data.data?.jobs || []
      const jobMap = {}
      jobs.forEach((j) => {
        if (!jobMap[j.fileId] || new Date(j.createdAt) > new Date(jobMap[j.fileId].createdAt)) {
          jobMap[j.fileId] = j
        }
      })
      setActivePrintJobs(jobMap)
    } catch (_) {}
  }

  useEffect(() => {
    fetchOrder()
    fetchPrinters()
    fetchPrintJobs()
  }, [shopId, orderId])

  useEffect(() => {
    const socket = getSocket()
    if (socket) {
      const handleJobUpdate = (job) => {
        if (job && job.fileId) {
          setActivePrintJobs((prev) => ({ ...prev, [job.fileId]: job }))
          fetchOrder()
        }
      }
      const handlePrintersSynced = () => {
        fetchPrinters()
      }
      socket.on('print_job:status_updated', handleJobUpdate)
      socket.on('print_jobs:new', handleJobUpdate)
      socket.on('printers:synced', handlePrintersSynced)
      return () => {
        socket.off('print_job:status_updated', handleJobUpdate)
        socket.off('print_jobs:new', handleJobUpdate)
        socket.off('printers:synced', handlePrintersSynced)
      }
    }
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

  const onlinePrinters = printers.filter((p) => p.status === 'ONLINE')
  const hasOnlinePrinter = onlinePrinters.length > 0

  const handleDirectPrint = async (fileId) => {
    if (isExpired) {
      toast.error('Cannot print: Document has expired and been securely deleted from storage.')
      return
    }
    if (!hasOnlinePrinter) {
      toast.error('No printer online. Please connect and run the print-agent.')
      return
    }

    try {
      setPrintingFileId(fileId)
      const targetPrinter = selectedPrinterId || onlinePrinters[0]?.id
      await api.post(`/shops/${shopId}/orders/${orderId}/print-direct`, {
        fileId,
        printerId: targetPrinter,
      })
      toast.success('Print job dispatched to printer queue!')
      fetchOrder()
      fetchPrintJobs()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch print job.')
    } finally {
      setPrintingFileId(null)
    }
  }

  const handlePrintAll = async () => {
    if (isExpired) {
      toast.error('Cannot print: Document has expired and been securely deleted from storage.')
      return
    }
    if (!hasOnlinePrinter) {
      toast.error('No printer online. Please connect and run the print-agent.')
      return
    }

    try {
      setPrintingAll(true)
      const targetPrinter = selectedPrinterId || onlinePrinters[0]?.id
      await api.post(`/shops/${shopId}/orders/${orderId}/print-direct`, {
        printerId: targetPrinter,
      })
      toast.success('All files queued for direct printing!')
      fetchOrder()
      fetchPrintJobs()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch print jobs.')
    } finally {
      setPrintingAll(false)
    }
  }

  const handleRecordPrintJob = handleDirectPrint;

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
        <p className="text-[var(--text-muted)] font-medium">Order not found.</p>
        <Link to={`/shops/${shopId}/orders`} className="text-[#0E7490] hover:text-[#155E75] text-sm mt-2 inline-block font-medium">
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
        return 'amber'
      case 'PRINTED':
      case 'READY':
      case 'COLLECTED':
      case 'COMPLETED':
        return 'green'
      case 'PAYMENT_PENDING':
        return 'amber'
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
            className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight">Order #{order.orderNumber}</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
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
                <CheckCircle2 size={14} strokeWidth={1.75} /> Accept Order
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRejectModalOpen(true)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
              >
                <XCircle size={14} strokeWidth={1.75} /> Reject
              </Button>
            </>
          ) : order.status === 'ACCEPTED' ? (
            <Button
              variant="primary"
              size="sm"
              loading={updatingStatus}
              onClick={() => handleUpdateStatus('PRINTING', 'Print production started')}
            >
              <Printer size={14} strokeWidth={1.75} /> Start Printing
            </Button>
          ) : order.status === 'PRINTING' || order.status === 'PROCESSING' ? (
            <Button
              variant="primary"
              size="sm"
              loading={updatingStatus}
              onClick={() => handleUpdateStatus('PRINTED', 'All documents printed successfully')}
            >
              <CheckCircle2 size={14} strokeWidth={1.75} /> Mark as Printed
            </Button>
          ) : order.status === 'PRINTED' || order.status === 'READY' ? (
            <Button
              variant="primary"
              size="sm"
              loading={updatingStatus}
              onClick={() => handleUpdateStatus('COLLECTED', 'Customer collected print order')}
            >
              <CheckCircle2 size={14} strokeWidth={1.75} /> Mark as Collected
            </Button>
          ) : null}

          {/* Record Counter Payment button */}
          {latestPayment?.status !== 'SUCCESS' && latestPayment?.status !== 'COUNTER_PAYMENT_COLLECTED' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCounterPayModalOpen(true)}
              className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
            >
              <CreditCard size={14} strokeWidth={1.75} /> Record Payment
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
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      <ShopNavTabs shopId={shopId} />

      {/* ── Order Header Summary ── */}
      <Card>
        <CardBody className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-[var(--text)] tracking-wider">
                {order.orderNumber}
              </span>
              <button
                type="button"
                onClick={copyOrderNumber}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors duration-150"
                title="Copy order number"
              >
                {copied ? <Check size={15} strokeWidth={1.75} className="text-green-600" /> : <Copy size={15} strokeWidth={1.75} />}
              </button>
              <Badge variant={getStatusVariant(order.status)} size="md" dot>
                {order.status}
              </Badge>
            </div>

            {/* Prominent Customer Identification Tag */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg">
              <div className="w-5 h-5 rounded-md bg-[#0E7490] text-white flex items-center justify-center font-bold text-xs shrink-0">
                <User size={12} strokeWidth={1.75} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[var(--text-muted)] font-medium">Customer:</span>
                <span className="font-semibold text-[var(--text)]">
                  {order.session?.customerName || order.customerName || 'Anonymous Visitor'}
                </span>
                {(order.session?.customerPhone || order.customerPhone) && (
                  <span className="inline-flex items-center gap-1 font-mono text-[#0E7490] font-semibold bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border)]">
                    <Phone size={10} strokeWidth={1.75} /> {order.session?.customerPhone || order.customerPhone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
              <span>Submitted: {new Date(order.createdAt).toLocaleString()}</span>
              <span>•</span>
              <span>Total Documents: {order.orderFiles?.length || 0}</span>
              <span>•</span>
              <span className="font-semibold text-[var(--text)]">Total Pages: {order.totalPages}</span>
            </div>
          </div>

          <div className="text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0 w-full md:w-auto border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)] block font-medium">Total Amount</span>
            <span className="text-3xl font-bold tabular-nums text-[var(--text)]">
              ₹ {Number(order.totalAmount || 0).toFixed(2)}
            </span>
          </div>
        </CardBody>
      </Card>

      {/* ── Owner Expiry & Data Privacy Controls ── */}
      <Card className={`border ${isExpired ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40' : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'}`}>
        <CardBody className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${isExpired ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'}`}>
              <Clock size={18} strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[var(--text)] text-sm">Document Lifetime & Privacy Retention</h3>
                <Badge variant={isExpired ? 'red' : 'yellow'} size="sm" dot>
                  {isExpired ? 'EXPIRED' : 'ACTIVE RETENTION'}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isExpired
                  ? 'All uploaded documents for this order have been securely unlinked and deleted from disk.'
                  : `Remaining storage window: `}
                {!isExpired && (
                  <span className="font-mono font-bold text-amber-800 dark:text-amber-400">{timeLeft}</span>
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
                >
                  <Clock size={13} strokeWidth={1.75} /> +1h Expiry
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={expiryActionLoading}
                  onClick={() => handleExtendExpiry(180)}
                >
                  <Clock size={13} strokeWidth={1.75} /> +3h Expiry
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={expiryActionLoading}
                  onClick={handlePurgeFilesNow}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
                >
                  <Trash2 size={13} strokeWidth={1.75} /> Purge Files Now
                </Button>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ── Payment Details & Method Banner ── */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              latestPayment?.status === 'SUCCESS' || latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                : latestPayment?.method === 'COUNTER' || latestPayment?.status === 'COUNTER_PAYMENT_DUE'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
            }`}>
              {latestPayment?.method === 'COUNTER' || latestPayment?.status === 'COUNTER_PAYMENT_DUE' || latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED' ? (
                <Banknote size={18} strokeWidth={1.75} />
              ) : (
                <CreditCard size={18} strokeWidth={1.75} />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[var(--text)] text-sm">Payment Details</h3>

                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                  latestPayment?.method === 'COUNTER' || latestPayment?.status === 'COUNTER_PAYMENT_DUE' || latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED'
                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900'
                    : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900'
                }`}>
                  {latestPayment?.method === 'COUNTER' || latestPayment?.status === 'COUNTER_PAYMENT_DUE' || latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED'
                    ? 'Pay at Counter'
                    : 'Paid Online (Razorpay)'}
                </span>

                <Badge
                  variant={
                    latestPayment?.status === 'SUCCESS' || latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED'
                      ? 'green'
                      : latestPayment?.status === 'FAILED'
                      ? 'red'
                      : 'yellow'
                  }
                  size="sm"
                  dot
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

              <p className="text-xs text-[var(--text-muted)]">
                {latestPayment?.status === 'COUNTER_PAYMENT_DUE' ? (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    Customer selected Pay at Counter. Collect ₹{Number(order.totalAmount || 0).toFixed(2)} when the customer picks up their print job.
                  </span>
                ) : latestPayment?.status === 'COUNTER_PAYMENT_COLLECTED' ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Payment collected at counter by operator.
                  </span>
                ) : latestPayment?.status === 'SUCCESS' ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Customer already paid online. No payment collection needed at pickup.
                  </span>
                ) : (
                  <span>Customer selected online payment (awaiting confirmation or counter payment).</span>
                )}
              </p>

              {(latestPayment?.referenceId || latestPayment?.razorpayPaymentId || latestPayment?.paidAt) && (
                <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-[var(--text-muted)] font-mono pt-0.5">
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

          <div className="text-left md:text-right shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)] block font-medium">Order Total</span>
            <span className="text-2xl font-bold tabular-nums text-[var(--text)]">
              ₹ {Number(latestPayment?.amount || order.totalAmount || 0).toFixed(2)}
            </span>
            {latestPayment?.status === 'COUNTER_PAYMENT_DUE' && (
              <span className="inline-block text-[11px] font-semibold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900 mt-1">
                To Collect: ₹{Number(order.totalAmount || 0).toFixed(2)}
              </span>
            )}
            {latestPayment?.status === 'SUCCESS' && (
              <span className="inline-block text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 mt-1">
                Fully Paid
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Customer Note */}
      {order.notes && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} strokeWidth={1.75} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-300">Customer Instructions</h4>
            <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5 italic">"{order.notes}"</p>
          </div>
        </div>
      )}

      {/* ── Uploaded Documents & Individual Settings ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Uploaded Documents ({order.orderFiles?.length || 0})
          </h2>
          <span className="text-xs text-[var(--text-muted)]">Each document has independent print settings</span>
        </div>

        {/* ── Direct Print Service & Printer Selector ── */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-3 h-3">
              {hasOnlinePrinter ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="absolute -inset-0.5 rounded-full bg-emerald-500/30 animate-ping"></span>
                </>
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)] opacity-50"></span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text)]">Direct Print Service</span>
                {hasOnlinePrinter ? (
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Ready
                  </span>
                ) : (
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--surface-hover)] text-[var(--text-muted)]">
                    Agent Offline
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {hasOnlinePrinter
                  ? `Hardware connected. Spooled files are cleared automatically after printing.`
                  : `No printer connected — connect the print-agent to enable Direct Print.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {printers.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <Printer size={14} className="text-[var(--text-muted)]" />
                <select
                  value={selectedPrinterId || ''}
                  onChange={(e) => setSelectedPrinterId(Number(e.target.value))}
                  className="input text-xs py-1.5 px-2.5 min-h-[34px] bg-[var(--surface)] border-[var(--border)] text-[var(--text)] rounded-lg font-medium"
                >
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.status === 'ONLINE' ? '● Online' : '○ Offline'} {p.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <Link
                to={`/shops/${shopId}/printers`}
                className="text-xs font-medium text-[#0E7490] hover:underline flex items-center gap-1"
              >
                Configure printers &rarr;
              </Link>
            )}

            {order.orderFiles && order.orderFiles.length > 1 && (
              <Button
                variant="primary"
                size="sm"
                loading={printingAll}
                disabled={!hasOnlinePrinter || isExpired}
                onClick={handlePrintAll}
                title={!hasOnlinePrinter ? 'Print agent must be running to Direct Print' : 'Print all order documents'}
              >
                <Printer size={13} strokeWidth={2} /> Print All
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {order.orderFiles?.map((file, idx) => {
            const cfg = file.printConfiguration || {}
            const hasPrinted = file.hasPrintedBefore || file.status === 'PRINTED'
            const filePurged = file.isPurged || isExpired

            return (
              <Card key={file.id} className="overflow-hidden">
                <CardBody className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shrink-0">
                        <FileText size={16} strokeWidth={1.75} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[var(--text)] text-sm">{file.originalName}</h3>
                          <Badge variant={filePurged ? 'red' : file.status === 'PRINTED' ? 'green' : 'gray'} dot>
                            {filePurged ? 'PURGED' : file.status}
                          </Badge>
                          {file.allowDownload ? (
                            <Badge variant="green" size="sm">
                              Download Allowed
                            </Badge>
                          ) : (
                            <Badge variant="gray" size="sm">
                              Direct Print Only
                            </Badge>
                          )}
                          {file.printJobsCount > 0 && (
                            <Badge variant="yellow" size="sm">
                              {file.printJobsCount} {file.printJobsCount === 1 ? 'print' : 'prints'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
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
                            <Eye size={13} strokeWidth={1.75} /> Preview
                          </Button>
                          {/* In-App Document Editor Button */}
                          {(file.mimeType === 'application/pdf' || file.mimeType?.startsWith('image/') || file.originalName?.match(/\.(pdf|jpe?g|png|webp)$/i)) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => window.open(`/shops/${shopId}/orders/${orderId}/files/${file.publicId || file.id}/edit`, '_blank')}
                              className="border-[#0E7490]/30 text-[#0E7490] hover:bg-[var(--accent-tint)] dark:text-[#22D3EE]"
                              title="Open in Document Editor"
                            >
                              <Edit3 size={13} strokeWidth={1.75} /> Edit
                            </Button>
                          )}


                          {/* Download Button: Gated by allowDownload */}
                          {file.allowDownload ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={downloadingFileId === file.id}
                              onClick={() => handleDownloadFile(file)}
                            >
                              <Download size={13} strokeWidth={1.75} /> Download
                            </Button>
                          ) : (
                            <div className="relative group inline-block">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled
                                className="opacity-50 cursor-not-allowed border-dashed"
                              >
                                <Lock size={12} strokeWidth={1.75} className="text-[var(--text-muted)]" /> Download
                              </Button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 w-60 p-2 text-[11px] leading-tight text-white bg-slate-900 rounded-lg shadow-lg text-center pointer-events-none">
                                Customer has not allowed downloading this file. Use Print.
                              </div>
                            </div>
                          )}

                          {/* Primary Direct Print Button */}
                          <div className="relative group inline-block">
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!hasOnlinePrinter || isExpired}
                              loading={printingFileId === file.id}
                              onClick={() => handleDirectPrint(file.id)}
                            >
                              <Printer size={13} strokeWidth={1.75} /> Print
                            </Button>
                            {!hasOnlinePrinter && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 w-52 p-2 text-[11px] leading-tight text-white bg-slate-900 rounded-lg shadow-lg text-center pointer-events-none">
                                Connect the print-agent to enable Direct Print.
                              </div>
                            )}
                          </div>

                          {/* Inline Print Job Status Badge */}
                          {activePrintJobs[file.id] && (
                            <Badge
                              variant={
                                activePrintJobs[file.id].status === 'DRIVER_COMPLETED' || activePrintJobs[file.id].status === 'COMPLETED'
                                  ? 'green'
                                  : activePrintJobs[file.id].status === 'FAILED'
                                  ? 'red'
                                  : activePrintJobs[file.id].status === 'SUBMITTED_TO_OS' || activePrintJobs[file.id].status === 'PRINTING'
                                  ? 'blue'
                                  : 'yellow'
                              }
                              size="sm"
                              dot
                            >
                              {activePrintJobs[file.id].status === 'DRIVER_COMPLETED'
                                ? 'Printed'
                                : activePrintJobs[file.id].status === 'SUBMITTED_TO_OS'
                                ? 'Sent to OS'
                                : activePrintJobs[file.id].status === 'QUEUED'
                                ? 'Queued'
                                : activePrintJobs[file.id].status}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                          <Trash2 size={13} strokeWidth={1.75} /> Purged from disk
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Print Configuration Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--surface-hover)] p-3 rounded-lg text-xs">
                    <div>
                      <span className="text-[var(--text-muted)] block font-medium">Color Mode</span>
                      <span className="font-semibold text-[var(--text)]">{cfg.colorMode}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block font-medium">Paper Size & Type</span>
                      <span className="font-semibold text-[var(--text)]">{cfg.paperSize} ({cfg.paperType || 'NORMAL'})</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block font-medium">Sides & Layout</span>
                      <span className="font-semibold text-[var(--text)]">
                        {cfg.duplexMode?.includes('DUPLEX') ? '2-Sided (Duplex)' : '1-Sided (Simplex)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block font-medium">Copies & Pages</span>
                      <span className="font-semibold text-[var(--text)]">
                        {cfg.copies || 1} {cfg.copies === 1 ? 'copy' : 'copies'} ({cfg.pageRange || 'All pages'})
                      </span>
                    </div>
                  </div>

                  {/* Additional Finishing Services */}
                  {file.orderFileServices && file.orderFileServices.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-[var(--text-muted)] font-medium">Services:</span>
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
              <History size={15} strokeWidth={1.75} className="text-[#0E7490]" />
              <h3 className="font-semibold text-[var(--text)] text-sm">File Expiry & Purge Audit Trail</h3>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-[var(--border)] text-xs">
              {order.expiryLogs.map((log) => (
                <div key={log.id} className="p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.action === 'EXTENDED' ? 'blue' : log.action === 'IMMEDIATE_DELETION' ? 'red' : 'gray'}>
                        {log.action}
                      </Badge>
                      <span className="font-medium text-[var(--text)]">{log.reason || 'Status update'}</span>
                    </div>
                    <p className="text-[var(--text-muted)] text-[11px]">
                      {new Date(log.createdAt).toLocaleString()} • Staff ID: {log.performedBy || 'System/Worker'}
                    </p>
                  </div>
                  {log.bytesFreed && log.bytesFreed !== '0' && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
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
            <History size={15} strokeWidth={1.75} className="text-[#0E7490]" />
            <h3 className="font-semibold text-[var(--text)] text-sm">Order Status Audit Trail</h3>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-[var(--border)] text-xs">
            {order.statusLogs?.map((log) => (
              <div key={log.id} className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text)]">{log.fromStatus || 'INIT'}</span>
                    <ChevronRight size={13} className="text-[var(--text-muted)]" />
                    <Badge variant={getStatusVariant(log.toStatus)} size="sm" dot>
                      {log.toStatus}
                    </Badge>
                  </div>
                  <p className="text-[var(--text-muted)]">{log.note || 'No comment recorded'}</p>
                </div>
                <div className="text-right text-[var(--text-muted)] text-[11px]">
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-card border border-[var(--border)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} strokeWidth={1.75} className="text-[#0E7490]" />
                <h3 className="font-semibold text-[var(--text)] text-sm truncate max-w-md">
                  {previewFile.originalName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                
                {/* Document Editor Button */}
                {(previewFile.mimeType === 'application/pdf' || previewFile.mimeType?.startsWith('image/') || previewFile.originalName?.match(/\.(pdf|jpe?g|png|webp)$/i)) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(`/shops/${shopId}/orders/${orderId}/files/${previewFile.publicId || previewFile.id}/edit`, '_blank')}
                    className="border-[#0E7490]/30 text-[#0E7490] hover:bg-[var(--accent-tint)] dark:text-[#22D3EE]"
                  >
                    <Edit3 size={13} strokeWidth={1.75} /> Edit Document
                  </Button>
                )}

                {/* Download Button Gated */}
                {previewFile.allowDownload ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={downloadingFileId === previewFile.id}
                    onClick={() => handleDownloadFile(previewFile)}
                  >
                    <Download size={13} strokeWidth={1.75} /> Download
                  </Button>
                ) : (
                  <div className="relative group inline-block">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled
                      className="opacity-50 cursor-not-allowed border-dashed"
                    >
                      <Lock size={12} strokeWidth={1.75} className="text-[var(--text-muted)]" /> Download
                    </Button>
                    <div className="absolute top-full right-0 mt-1.5 hidden group-hover:block z-50 w-56 p-2 text-[11px] leading-tight text-white bg-slate-900 rounded-lg shadow-lg text-center pointer-events-none">
                      Customer has not allowed downloading this file. Use Print.
                    </div>
                  </div>
                )}

                {/* Direct Print Button */}
                <div className="relative group inline-block">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!hasOnlinePrinter || isExpired}
                    loading={printingFileId === previewFile.id}
                    onClick={() => handleDirectPrint(previewFile.id)}
                  >
                    <Printer size={13} strokeWidth={1.75} /> Direct Print
                  </Button>
                  {!hasOnlinePrinter && (
                    <div className="absolute top-full right-0 mt-1.5 hidden group-hover:block z-50 w-52 p-2 text-[11px] leading-tight text-white bg-slate-900 rounded-lg shadow-lg text-center pointer-events-none">
                      Connect the print-agent to enable Direct Print.
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150 ml-1"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[var(--bg)] p-4 overflow-auto flex items-center justify-center min-h-[450px]">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-2 text-[var(--text-muted)] py-16">
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
                    <FileText size={40} strokeWidth={1.5} className="text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[var(--text)]">{previewFile.originalName}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Native browser preview is not available for this format. Use the download button to inspect on your PC.
                    </p>
                    {previewFile.allowDownload ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-3"
                        loading={downloadingFileId === previewFile.id}
                        onClick={() => handleDownloadFile(previewFile)}
                      >
                        <Download size={13} strokeWidth={1.75} /> Download File
                      </Button>
                    ) : (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
                        <Lock size={12} strokeWidth={1.75} />
                        <span>Customer has not allowed downloading this file.</span>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="text-center p-8 text-[var(--text-muted)]">
                  <AlertCircle size={36} strokeWidth={1.75} className="text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[var(--text)]">Preview Unavailable</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 mb-3">Unable to stream document preview.</p>
                  {previewFile.allowDownload ? (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={downloadingFileId === previewFile.id}
                      onClick={() => handleDownloadFile(previewFile)}
                    >
                      <Download size={13} strokeWidth={1.75} /> Download Instead
                    </Button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
                      <Lock size={12} strokeWidth={1.75} />
                      <span>Customer has not allowed downloading this file.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Counter Payment Modal ── */}
      {counterPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-xl w-full max-w-md p-6 shadow-card border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text)] text-base">Record Counter Payment</h3>
              <button
                onClick={() => setCounterPayModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg transition-colors duration-150"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleRecordCounterPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Amount Collected (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="input text-sm font-bold tabular-nums"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Payment Method</label>
                <select
                  value={counterMethod}
                  onChange={(e) => setCounterMethod(e.target.value)}
                  className="input"
                >
                  <option value="CASH">Cash at Counter</option>
                  <option value="UPI">Store UPI / QR Scanner</option>
                  <option value="CARD">Card POS Terminal</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Receipt / Staff Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash, receipt #1042"
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                  className="input"
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-xl w-full max-w-md p-6 shadow-card border border-[var(--border)] space-y-4">
            <h3 className="font-semibold text-[var(--text)] text-base">Reject Print Order</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Please enter a reason for rejecting this print order (e.g. unreadable font, corrupted document, paper out of stock):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="input py-2 h-auto text-xs"
              required
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
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
