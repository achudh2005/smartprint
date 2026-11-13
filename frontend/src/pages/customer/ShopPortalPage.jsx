import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  UploadCloud, FileText, CheckCircle2, AlertCircle, X, Eye,
  Plus, Minus, Settings2, Sparkles, Store, Clock, MapPin,
  Phone, ArrowRight, RefreshCw, Layers, ShieldCheck, File,
  Repeat, Ban, Info, CreditCard, Banknote, User, Download, Lock } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Badge, Spinner, Alert, ThemeToggle } from '../../components/ui'
import api from '../../lib/api'
import { openRazorpayCheckout } from '../../lib/razorpay'
import toast from 'react-hot-toast'

export default function ShopPortalPage() {
  const { shopCode } = useParams()
  const navigate = useNavigate()

  // State
  const [shop, setShop] = useState(null)
  const [sessionToken, setSessionToken] = useState(null)
  const [draftOrder, setDraftOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [expiryOption, setExpiryOption] = useState('1h')
  const [paymentMethod, setPaymentMethod] = useState('COUNTER')
  const [submitting, setSubmitting] = useState(false)
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('')

  // Modals & Active selections
  const [previewFile, setPreviewFile] = useState(null)
  const [activeConfigIndex, setActiveConfigIndex] = useState(0)

  const fileInputRef = useRef(null)
  const replaceInputRef = useRef(null)
  const replaceTargetRef = useRef(null)
  const abortControllerRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  // 1. Fetch Shop & Initialize Session
  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        setError('')

        // Fetch public shop profile
        const { data: shopRes } = await api.get(`/customer/shops/${shopCode}`)
        const shopData = shopRes.data
        setShop(shopData)
        if (shopData.settings?.defaultExpiryOption) {
          setExpiryOption(shopData.settings.defaultExpiryOption)
        }

        // Check for existing session token in localStorage
        const storageKey = `smartprint_session_${shopCode.toUpperCase()}`
        const existingToken = localStorage.getItem(storageKey)

        // Initialize or resume session
        const { data: sessionRes } = await api.post('/customer/sessions', {
          shopCode,
          existingToken,
        })

        const { sessionToken: token, draftOrder: order } = sessionRes.data
        setSessionToken(token)
        setDraftOrder(order)
        localStorage.setItem(storageKey, token)
      } catch (err) {
        setError(err.response?.data?.message || 'Could not connect to this print shop. Please verify the QR code.')
      } finally {
        setLoading(false)
      }
    }

    if (shopCode) {
      init()
    }
  }, [shopCode])

  // Normalized accepted formats (clean, lowercase, without leading dot)
  const rawAccepted = shop?.settings?.acceptedFormats
  const acceptedFormatsList = (
    Array.isArray(rawAccepted)
      ? rawAccepted
      : typeof rawAccepted === 'string'
        ? rawAccepted.split(',')
        : ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'txt']
  )
    .map((f) => String(f).trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean)

  // 2. Handle File Uploads
  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0 || !sessionToken) return

    const filesArray = Array.from(fileList)
    const acceptedFormats = acceptedFormatsList.length > 0 ? acceptedFormatsList : ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'txt']
    const maxBytes = (shop?.settings?.maxUploadSizeMb || 50) * 1024 * 1024

    const mimeMap = {
      'application/pdf': 'pdf',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/pjpeg': 'jpeg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'text/plain': 'txt',
    }

    // Pre-flight client checks
    for (const f of filesArray) {
      const rawExt = f.name && f.name.includes('.') ? f.name.split('.').pop() : ''
      const ext = (rawExt || '').trim().toLowerCase().replace(/^\./, '')
      const mimeExt = f.type ? mimeMap[f.type.toLowerCase()] : null

      const isAccepted =
        acceptedFormats.length === 0 ||
        acceptedFormats.some((fmt) => {
          const cleanFmt = fmt.toLowerCase().replace(/^\./, '')
          return cleanFmt === ext || (mimeExt && cleanFmt === mimeExt)
        })

      if (!isAccepted) {
        toast.error(`"${f.name}" is not accepted. Allowed: ${acceptedFormats.map((e) => `.${e}`).join(', ')}`)
        return
      }
      if (f.size > maxBytes) {
        toast.error(`"${f.name}" exceeds the ${shop?.settings?.maxUploadSizeMb || 50} MB limit.`)
        return
      }
    }

    const formData = new FormData()
    filesArray.forEach((f) => formData.append('files', f))

    try {
      abortControllerRef.current = new AbortController()
      setUploading(true)
      setUploadProgress(20)

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev))
      }, 300)

      const { data: res } = await api.post(`/customer/sessions/${sessionToken}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: abortControllerRef.current.signal,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Refresh session state
      await refreshSession()
      const successMsg = filesArray.length === 1 ? 'File was uploaded successfully!' : `${filesArray.length} files were uploaded successfully!`
      setUploadSuccessMessage(successMsg)
      toast.success(successMsg)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        toast('Upload cancelled.')
      } else {
        toast.error(err.response?.data?.message || 'Failed to upload document.')
      }
    } finally {
      setUploading(false)
      setUploadProgress(0)
      abortControllerRef.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Cancel upload in progress
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  // Replace a specific document
  const triggerReplace = (filePublicId) => {
    replaceTargetRef.current = filePublicId
    replaceInputRef.current?.click()
  }

  const handleFileReplacement = async (e) => {
    const file = e.target.files?.[0]
    const targetPublicId = replaceTargetRef.current
    if (!file || !targetPublicId || !sessionToken) return

    try {
      setUploading(true)
      // Delete old file
      await api.delete(`/customer/sessions/${sessionToken}/files/${targetPublicId}`)
      // Upload new replacement
      const formData = new FormData()
      formData.append('files', file)
      await api.post(`/customer/sessions/${sessionToken}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await refreshSession()
      toast.success('Document replaced successfully!')
    } catch (err) {
      toast.error('Failed to replace document.')
    } finally {
      setUploading(false)
      replaceTargetRef.current = null
      if (replaceInputRef.current) replaceInputRef.current.value = ''
    }
  }

  // Refresh current draft order from server
  const refreshSession = async () => {
    if (!sessionToken) return
    const { data } = await api.get(`/customer/sessions/${sessionToken}`)
    setDraftOrder(data.data.draftOrder)
  }

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // 3. Update File Print Settings
  const handleConfigUpdate = async (filePublicId, field, value) => {
    const file = draftOrder.files.find((f) => f.publicId === filePublicId)
    if (!file) return

    const currentConfig = file.printConfiguration || {}
    const updatedConfig = {
      copies: currentConfig.copies || 1,
      colorMode: currentConfig.colorMode || 'BLACK_WHITE',
      paperSize: currentConfig.paperSize || 'A4',
      paperType: currentConfig.paperType || 'NORMAL',
      orientation: currentConfig.orientation || 'PORTRAIT',
      duplexMode: currentConfig.duplexMode || 'SIMPLEX',
      pageRange: currentConfig.pageRange || 'ALL',
      [field]: value,
      allowDownload: field === 'allowDownload' ? Boolean(value) : Boolean(file.allowDownload),
    }

    // Optimistic UI update
    setDraftOrder((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        f.publicId === filePublicId
          ? {
              ...f,
              allowDownload: field === 'allowDownload' ? Boolean(value) : Boolean(f.allowDownload),
              printConfiguration: updatedConfig,
            }
          : f
      ),
    }))

    try {
      await api.put(
        `/customer/sessions/${sessionToken}/files/${filePublicId}/config`,
        updatedConfig
      )
      // Sync authoritative pricing returned from server
      await refreshSession()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings.')
      await refreshSession()
    }
  }

  
  // Toggle single file download permission
  const handleToggleDownloadPermission = async (filePublicId, nextValue) => {
    setDraftOrder((prev) => ({
      ...prev,
      files: (prev.files || []).map((f) =>
        f.publicId === filePublicId ? { ...f, allowDownload: nextValue } : f
      ),
    }))

    try {
      await api.patch(
        `/customer/sessions/${sessionToken}/files/${filePublicId}/download-permission`,
        { allowDownload: nextValue }
      )
      toast.success(
        nextValue
          ? 'Shop download turned ON for this file'
          : 'Shop download turned OFF (Direct Print only)'
      )
    } catch (_) {
      try {
        await handleConfigUpdate(filePublicId, 'allowDownload', nextValue)
      } catch (err) {
        toast.error('Failed to update download permission.')
      }
    }
  }

  // Toggle all files download permission
  const handleToggleAllDownload = async (enable) => {
    setDraftOrder((prev) => ({
      ...prev,
      files: (prev.files || []).map((f) => ({ ...f, allowDownload: enable })),
    }))

    try {
      await api.patch(`/customer/sessions/${sessionToken}/download-permission`, {
        allowDownload: enable,
      })
      toast.success(
        enable
          ? 'Shop download turned ON for all files'
          : 'Shop download turned OFF for all files'
      )
    } catch (_) {
      for (const f of (draftOrder?.files || [])) {
        handleConfigUpdate(f.publicId, 'allowDownload', enable)
      }
    }
  }

  // 4. Toggle Additional Service
  const handleToggleService = async (filePublicId, serviceId, isAttached) => {
    try {
      if (isAttached) {
        await api.delete(`/customer/sessions/${sessionToken}/files/${filePublicId}/services/${serviceId}`)
      } else {
        await api.post(`/customer/sessions/${sessionToken}/files/${filePublicId}/services`, {
          serviceId,
          quantity: 1,
        })
      }
      await refreshSession()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update service.')
    }
  }

  // 5. Delete File
  const handleDeleteFile = async (filePublicId) => {
    try {
      await api.delete(`/customer/sessions/${sessionToken}/files/${filePublicId}`)
      await refreshSession()
      toast.success('Document removed.')
    } catch (err) {
      toast.error('Failed to remove document.')
    }
  }

  // 6. Confirm & Submit Order
  const handleConfirmOrder = async () => {
    if (!draftOrder?.files || draftOrder.files.length === 0) {
      toast.error('Please upload at least one document before submitting.')
      return
    }

    if (!customerName || !customerName.trim()) {
      toast.error('Please enter your name so the shop knows whose order this is.')
      return
    }

    try {
      setSubmitting(true)
      const filesAllowDownload = (draftOrder?.files || []).reduce((acc, f) => {
        acc[f.publicId] = Boolean(f.allowDownload)
        return acc
      }, {})

      const { data } = await api.post(`/customer/sessions/${sessionToken}/confirm`, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: customerNotes,
        expiryOption,
        paymentMethod,
        filesAllowDownload,
      })

      const confirmed = data.data
      localStorage.removeItem(`smartprint_session_${shopCode.toUpperCase()}`)

      // If online payment is enabled for this shop, trigger Razorpay
      if (confirmed.paymentRequired) {
        try {
          const rzpRes = await api.post('/payments/razorpay/order', {
            orderId: confirmed.orderNumber,
          })
          const rzpData = rzpRes.data.data

          await openRazorpayCheckout({
            keyId: rzpData.keyId,
            amount: rzpData.amount,
            currency: rzpData.currency,
            razorpayOrderId: rzpData.razorpayOrderId,
            orderNumber: confirmed.orderNumber,
            onSuccess: async (rzpResponse) => {
              try {
                await api.post('/payments/razorpay/verify', {
                  orderId: confirmed.orderNumber,
                  razorpayOrderId: rzpResponse.razorpay_order_id,
                  razorpayPaymentId: rzpResponse.razorpay_payment_id,
                  razorpaySignature: rzpResponse.razorpay_signature,
                })
                toast.success('Payment verified! Order confirmed.')
                navigate(`/orders/${confirmed.orderNumber}`)
              } catch (vErr) {
                toast.error('Payment verification failed.')
                navigate(`/orders/${confirmed.orderNumber}`)
              }
            },
            onDismiss: () => {
              toast('Payment dismissed. You can pay from the order tracker or at the counter.', { icon: 'ℹ️' })
              navigate(`/orders/${confirmed.orderNumber}`)
            },
          })
          return
        } catch (payErr) {
          toast.error(payErr.response?.data?.message || 'Payment initialization failed. Navigating to order page.')
          navigate(`/orders/${confirmed.orderNumber}`)
          return
        }
      }

      toast.success('Print request submitted successfully!')
      navigate(`/orders/${confirmed.orderNumber}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit order.')
    } finally {
      setSubmitting(false)
    }
  }

  // Format file size
  const formatBytes = (bytes) => {
    const n = Number(bytes)
    if (!n || isNaN(n) || n <= 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(n) / Math.log(k))
    if (i < 0 || i >= sizes.length) return `${n} B`
    const val = Number(n / Math.pow(k, i))
    return (isNaN(val) ? '0' : parseFloat(val.toFixed(1))) + ' ' + sizes[i]
  }

  // Safe price formatting
  const formatPrice = (val) => {
    const num = Number(val)
    return isNaN(num) ? '0.00' : num.toFixed(2)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)] font-medium">Connecting to print shop...</p>
        </div>
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="max-w-md w-full bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] text-center shadow-xs">
          <AlertCircle size={36} strokeWidth={1.75} className="text-red-500 mx-auto mb-3" />
          <h1 className="text-base font-semibold text-[var(--text)] mb-2">Shop Unavailable</h1>
          <p className="text-xs text-[var(--text-muted)] mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="primary" className="min-h-[44px]">
            <RefreshCw size={15} strokeWidth={1.75} /> Try Again
          </Button>
        </div>
      </div>
    )
  }

  const currencySymbol = shop.settings?.currency === 'INR' ? '₹' : (shop.settings?.currency || '₹')
  const activeFile = draftOrder?.files?.[activeConfigIndex] || draftOrder?.files?.[0]
  const hasFiles = draftOrder?.files && draftOrder.files.length > 0

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] pb-32 sm:pb-20 transition-colors duration-150">
      {/* Top Shop Brand Header */}
      <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-20 shadow-xs transition-colors duration-150">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name} className="w-9 h-9 rounded-lg object-cover border border-[var(--border)] shrink-0" />
            ) : (
              <div className="w-9 h-9 bg-[var(--accent)] text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                {shop.name ? shop.name[0] : 'S'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-[var(--text)] text-sm sm:text-base leading-tight truncate">{shop.name}</h1>
                <Badge variant="green" size="sm" dot>Live</Badge>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5 truncate">Code: {shop.shopCode}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/about"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] hover:text-[var(--text)] border border-[var(--border)] transition-colors min-h-[36px]"
              title="About SmartPrint"
            >
              <Info size={13} strokeWidth={1.75} className="text-[#0E7490] shrink-0" />
              <span className="hidden sm:inline">About</span>
            </Link>
            <ThemeToggle />
            <div className="text-right pl-2 border-l border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] block">Est. Total</span>
              <span className="text-sm sm:text-base font-semibold text-[#0E7490] dark:text-[#22D3EE] tabular-nums">
                {currencySymbol} {formatPrice(draftOrder?.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        {/* Shop Info Card */}
        <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shadow-xs">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <MapPin size={13} strokeWidth={1.75} className="shrink-0 text-[var(--text-muted)]" />
              <span className="truncate">{shop.address || 'In-store Print Counter'}</span>
            </div>
            {shop.contactPhone && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Phone size={13} strokeWidth={1.75} className="shrink-0 text-[var(--text-muted)]" />
                <span>{shop.contactPhone}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] tabular-nums">
            <span className="bg-[var(--surface-hover)] text-[var(--text-muted)] px-2 py-1 rounded-md border border-[var(--border)]">
              Max: <strong className="text-[var(--text)]">{shop.settings?.maxUploadSizeMb || 50} MB</strong>
            </span>
            <span className="bg-[var(--surface-hover)] text-[var(--text-muted)] px-2 py-1 rounded-md border border-[var(--border)]">
              Formats: <strong className="text-[var(--text)]">{acceptedFormatsList.slice(0, 4).map((e) => e.toUpperCase()).join(', ')}</strong>
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-1 text-xs font-medium text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5 text-[var(--text)]">
            <span className="w-5 h-5 rounded-full bg-[#0E7490] text-white flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Upload</span>
          </div>
          <div className="w-8 h-px bg-[var(--border)]" />
          <div className={`flex items-center gap-1.5 ${hasFiles ? 'text-[var(--text)]' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${hasFiles ? 'bg-[#0E7490] text-white' : 'bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]'}`}>2</span>
            <span>Options</span>
          </div>
          <div className="w-8 h-px bg-[var(--border)]" />
          <div className={`flex items-center gap-1.5 ${hasFiles ? 'text-[var(--text)]' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${hasFiles ? 'bg-[#0E7490] text-white' : 'bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]'}`}>3</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* Document Upload Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors duration-150 ${
            dragActive
              ? 'border-[#0E7490] bg-[var(--accent-tint)]'
              : 'border-[var(--border)] bg-[var(--surface)] hover:border-[#0E7490]/50 hover:bg-[var(--surface-hover)]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={[...new Set([...acceptedFormatsList.map((ext) => `.${ext}`), '.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt', 'application/pdf', 'image/*'])].join(',')}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <input
            ref={replaceInputRef}
            type="file"
            accept={[...new Set([...acceptedFormatsList.map((ext) => `.${ext}`), '.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt', 'application/pdf', 'image/*'])].join(',')}
            className="hidden"
            onChange={handleFileReplacement}
          />

          <div className="w-12 h-12 bg-[var(--accent-tint)] text-[#0E7490] dark:text-[#22D3EE] rounded-xl flex items-center justify-center mx-auto mb-3 border border-[var(--border)]">
            {uploading ? (
              <Spinner size="md" />
            ) : (
              <UploadCloud size={24} strokeWidth={1.75} />
            )}
          </div>

          <h3 className="text-sm sm:text-base font-semibold text-[var(--text)] mb-1">
            {uploading ? 'Processing documents...' : 'Tap or Drag documents here to print'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mb-4">
            PDF, Word DOCX, JPEG, PNG, or Text. Multiple files supported.
          </p>

          {uploading ? (
            <div className="space-y-3">
              <div className="w-48 mx-auto bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#0E7490] h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCancelUpload(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 transition-colors min-h-[36px]"
              >
                <Ban size={13} strokeWidth={1.75} /> Cancel Upload
              </button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              className="min-h-[44px] px-5"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
            >
              Browse Files
            </Button>
          )}
        </div>

        {/* Uploaded Documents List */}
        {hasFiles && (
          <div className="space-y-3">
            {uploadSuccessMessage && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} strokeWidth={2} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{uploadSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadSuccessMessage('')}
                  className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 p-1"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                <FileText size={15} strokeWidth={1.75} className="text-[#0E7490]" />
                Uploaded Documents ({draftOrder.files.length})
              </h2>
              <span className="text-xs text-[var(--text-muted)]">Configure settings below</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {draftOrder.files.map((file, idx) => {
                const config = file.printConfiguration || {}
                const isConfigActive = activeFile?.publicId === file.publicId
                const isReady = file.status === 'READY'

                return (
                  <Card
                    key={file.publicId}
                    className={`transition-colors duration-150 ${isConfigActive ? 'ring-1 ring-[#0E7490]' : ''}`}
                  >
                    <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* File Icon & Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[#0E7490] dark:text-[#22D3EE] shrink-0">
                          <File size={16} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-[var(--text)] truncate">
                            {file.originalName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                            <span>{formatBytes(file.fileSizeBytes)}</span>
                            <span>•</span>
                            <span className="font-medium text-[var(--text)]">
                              {file.pageCount || 1} {file.pageCount === 1 ? 'page' : 'pages'}
                            </span>
                            <span>•</span>
                            <Badge variant={isReady ? 'green' : 'red'} size="sm" dot>
                              {file.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* File Action Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                        <div className="text-right sm:mr-2">
                          <span className="text-[10px] text-[var(--text-muted)] block sm:hidden">Price</span>
                          <span className="text-xs sm:text-sm font-semibold text-[var(--text)] tabular-nums">
                            {currencySymbol} {formatPrice(config.calculatedTotal)}
                          </span>
                        </div>

                        {/* Preview */}
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                          title="Preview Document"
                          aria-label="Preview Document"
                        >
                          <Eye size={15} strokeWidth={1.75} />
                        </button>

                        {/* Replace Document */}
                        <button
                          type="button"
                          onClick={() => triggerReplace(file.publicId)}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                          title="Replace Document"
                          aria-label="Replace Document"
                        >
                          <Repeat size={15} strokeWidth={1.75} />
                        </button>

                        {/* Configure Button */}
                        <Button
                          variant={isConfigActive ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setActiveConfigIndex(idx)}
                          className="min-h-[36px] text-xs px-3"
                        >
                          <Settings2 size={13} strokeWidth={1.75} />
                          {isConfigActive ? 'Done' : 'Options'}
                        </Button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.publicId)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                          title="Remove file"
                          aria-label="Remove file"
                        >
                          <X size={15} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>

                    
                      {/* Visible Download Permission ON/OFF bar directly on file card */}
                      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--surface-hover)] border-t border-[var(--border)] rounded-b-xl text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 font-semibold text-[11px] px-2.5 py-0.5 rounded-full ${
                            file.allowDownload
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-500/10 text-[var(--text-muted)] border border-[var(--border)]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${file.allowDownload ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {file.allowDownload ? 'Shop Download: ON' : 'Shop Download: OFF'}
                          </span>
                          <span className="text-[var(--text-muted)] text-[11px] hidden sm:inline">
                            {file.allowDownload
                              ? 'Shop owner is allowed to download this file'
                              : 'Direct Print only — shop owner cannot save or keep a copy'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleDownloadPermission(file.publicId, !file.allowDownload)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
                            file.allowDownload
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
                          }`}
                        >
                          <span>{file.allowDownload ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>

                    {/* Inline Configuration Details */}
                    {isConfigActive && (
                      <div className="bg-[var(--surface-hover)] border-t border-[var(--border)] p-4 sm:p-5 rounded-b-xl space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                          {/* Copies */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-muted)]">Copies</label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleConfigUpdate(file.publicId, 'copies', Math.max(1, (config.copies || 1) - 1))}
                                className="w-9 h-9 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] min-w-[36px]"
                                aria-label="Decrease copies"
                              >
                                <Minus size={13} strokeWidth={2} />
                              </button>
                              <span className="w-8 text-center font-semibold text-xs text-[var(--text)] tabular-nums">
                                {config.copies || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleConfigUpdate(file.publicId, 'copies', (config.copies || 1) + 1)}
                                className="w-9 h-9 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] min-w-[36px]"
                                aria-label="Increase copies"
                              >
                                <Plus size={13} strokeWidth={2} />
                              </button>
                            </div>
                          </div>

                          {/* Color Mode */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-muted)]">Color Mode</label>
                            <select
                              value={config.colorMode || 'BLACK_WHITE'}
                              onChange={(e) => handleConfigUpdate(file.publicId, 'colorMode', e.target.value)}
                              className="input text-xs py-1.5 min-h-[38px] bg-[var(--surface)] text-[var(--text)]"
                            >
                              <option value="BLACK_WHITE">Black & White</option>
                              <option value="COLOR">Full Color</option>
                              <option value="GRAYSCALE">Grayscale</option>
                            </select>
                          </div>

                          {/* Paper Size */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-muted)]">Paper Size</label>
                            <select
                              value={config.paperSize || 'A4'}
                              onChange={(e) => handleConfigUpdate(file.publicId, 'paperSize', e.target.value)}
                              className="input text-xs py-1.5 min-h-[38px] bg-[var(--surface)] text-[var(--text)]"
                            >
                              <option value="A4">A4 (Standard)</option>
                              <option value="A3">A3 (Large)</option>
                              <option value="LEGAL">Legal</option>
                              <option value="LETTER">Letter</option>
                            </select>
                          </div>

                          {/* Paper Type */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-muted)]">Paper Type</label>
                            <select
                              value={config.paperType || 'NORMAL'}
                              onChange={(e) => handleConfigUpdate(file.publicId, 'paperType', e.target.value)}
                              className="input text-xs py-1.5 min-h-[38px] bg-[var(--surface)] text-[var(--text)]"
                            >
                              <option value="NORMAL">Normal (75 GSM)</option>
                              <option value="PREMIUM">Premium Bond (100 GSM)</option>
                              <option value="PHOTO">Glossy Photo</option>
                              <option value="BOND">Heavy Cardstock</option>
                            </select>
                          </div>

                          {/* Duplex / Sides */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-muted)]">Sides</label>
                            <select
                              value={config.duplexMode || 'SIMPLEX'}
                              onChange={(e) => handleConfigUpdate(file.publicId, 'duplexMode', e.target.value)}
                              className="input text-xs py-1.5 min-h-[38px] bg-[var(--surface)] text-[var(--text)]"
                            >
                              <option value="SIMPLEX">Single-Sided</option>
                              <option value="DUPLEX_LONG_EDGE">2-Sided (Flip Long Edge)</option>
                              <option value="DUPLEX_SHORT_EDGE">2-Sided (Flip Short Edge)</option>
                            </select>
                          </div>
                        </div>

                        {/* Page Range & Orientation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-muted)]">
                              Pages to Print <span className="font-normal text-[var(--text-muted)]">("ALL" or e.g. "1-5, 8")</span>
                            </label>
                            <input
                              type="text"
                              defaultValue={config.pageRange || 'ALL'}
                              onBlur={(e) => handleConfigUpdate(file.publicId, 'pageRange', e.target.value)}
                              placeholder="ALL"
                              className="input text-xs py-1.5 min-h-[38px] bg-[var(--surface)] text-[var(--text)]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-muted)]">Orientation</label>
                            <div className="flex gap-2">
                              {['PORTRAIT', 'LANDSCAPE'].map((ori) => (
                                <button
                                  key={ori}
                                  type="button"
                                  onClick={() => handleConfigUpdate(file.publicId, 'orientation', ori)}
                                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors min-h-[38px] ${
                                    (config.orientation || 'PORTRAIT') === ori
                                      ? 'bg-[var(--accent-tint)] border-[#0E7490] text-[#0E7490] dark:text-[#22D3EE]'
                                      : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                                  }`}
                                >
                                  {ori === 'PORTRAIT' ? 'Portrait' : 'Landscape'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        
                        {/* Download Permission Toggle */}
                        <div className="pt-3 border-t border-[var(--border)] flex items-start justify-between gap-4">
                          <div className="space-y-0.5 max-w-[80%]">
                            <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5 cursor-pointer">
                              <span>Allow shop to download this file</span>
                              {file.allowDownload && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  Allowed
                                </span>
                              )}
                            </label>
                            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                              Off by default for your privacy (e.g. ID documents). When off, the shop can only print this file directly — they cannot save or keep a copy.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              checked={Boolean(file.allowDownload)}
                              onChange={(e) => handleConfigUpdate(file.publicId, 'allowDownload', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0E7490]"></div>
                          </label>
                        </div>

                        {/* Additional Services for this file */}
                        {shop.additionalServices && shop.additionalServices.length > 0 && (
                          <div className="pt-3 border-t border-[var(--border)]">
                            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-2">
                              Additional Services:
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {shop.additionalServices.map((svc) => {
                                const isAttached = file.services?.some(
                                  (s) => s.additionalServiceId === svc.id
                                )
                                return (
                                  <button
                                    key={svc.id}
                                    type="button"
                                    onClick={() => handleToggleService(file.publicId, svc.id, isAttached)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[36px] ${
                                      isAttached
                                        ? 'bg-[#0E7490] text-white border-[#0E7490]'
                                        : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
                                    }`}
                                  >
                                    <span>{svc.name} (+{currencySymbol}{formatPrice(svc.price)})</span>
                                    {isAttached ? <CheckCircle2 size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Order Summary & Customer Info */}
        {hasFiles && (
          <Card>
            <CardBody className="space-y-4 p-5">
              {/* Privacy Lifetime Expiry */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                    <Clock size={13} strokeWidth={1.75} className="text-[#0E7490]" />
                    <span>File Privacy & Auto-Purge Lifetime</span>
                  </label>
                  <span className="text-[11px] text-[var(--text-muted)]">Auto-deleted after expiry</span>
                </div>
                <select
                  value={expiryOption}
                  onChange={(e) => setExpiryOption(e.target.value)}
                  className="input text-xs font-medium bg-[var(--surface)] text-[var(--text)] min-h-[44px]"
                >
                  {(shop.settings?.enabledExpiryOptions || ['15m', '1h', '3h', '8h']).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === '15m' ? '15 Minutes (Maximum Privacy)' :
                       opt === '1h' ? '1 Hour (Standard / Recommended)' :
                       opt === '3h' ? '3 Hours' :
                       opt === '8h' ? '8 Hours' : `${opt}`}
                    </option>
                  ))}
                </select>
              </div>

              
              {/* Order-wide Shop Download Permission Switch */}
              <div className="pt-3 border-t border-[var(--border)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Download size={13} strokeWidth={2} className="text-[#0E7490]" />
                      <label className="text-xs font-semibold text-[var(--text)]">
                        Shop Download Permission
                      </label>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Allow print shop owner to download files to their computer. Turn OFF for ID cards or sensitive personal files.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAllDownload(true)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                        draftOrder.files.every((f) => f.allowDownload)
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      Allow All (ON)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllDownload(false)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                        draftOrder.files.every((f) => !f.allowDownload)
                          ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-800 shadow-xs'
                          : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      Block All (OFF)
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text)] block mb-1">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="input text-xs font-medium pl-8 min-h-[44px] bg-[var(--surface)] text-[var(--text)]"
                      />
                      <User size={14} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Printed on your order tag for collection</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text)] block mb-1">
                      Phone Number <span className="text-[var(--text-muted)] font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="input text-xs font-medium pl-8 min-h-[44px] bg-[var(--surface)] text-[var(--text)]"
                      />
                      <Phone size={14} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Used only to notify you when prints are ready</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text)] block mb-1">
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="e.g. Please staple top-left corner, or call when ready..."
                  rows={2}
                  className="input text-xs bg-[var(--surface)] text-[var(--text)]"
                />
              </div>

              {/* Payment Option Selection */}
              <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                <label className="text-xs font-semibold text-[var(--text)] block">
                  Select Payment Option
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Pay at Counter */}
                  <div
                    onClick={() => setPaymentMethod('COUNTER')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 select-none min-h-[44px] ${
                      paymentMethod === 'COUNTER'
                        ? 'border-[#0E7490] bg-[var(--accent-tint)]'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      paymentMethod === 'COUNTER' ? 'bg-[#0E7490] text-white' : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                    }`}>
                      <Banknote size={16} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-[var(--text)] text-xs">Pay at Counter</span>
                        <Badge variant="green" size="sm" dot>Pay on Pickup</Badge>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                        Pay cash or shop UPI when you collect your printed documents.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Pay Online via Razorpay */}
                  {shop.settings?.paymentEnabled && (
                    <div
                      onClick={() => setPaymentMethod('ONLINE')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 select-none min-h-[44px] ${
                        paymentMethod === 'ONLINE'
                          ? 'border-[#0E7490] bg-[var(--accent-tint)]'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${
                        paymentMethod === 'ONLINE' ? 'bg-[#0E7490] text-white' : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                      }`}>
                        <CreditCard size={16} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-[var(--text)] text-xs">Pay Online</span>
                          <Badge variant="blue" size="sm">UPI / Cards</Badge>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                          Pay instantly with GPay, PhonePe, Paytm, Cards, or Netbanking.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Confirmation Bar */}
              <div className="hidden sm:flex sm:items-center sm:justify-between gap-4 pt-4 border-t border-[var(--border)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] block">
                      {paymentMethod === 'ONLINE' ? 'Total Payable Online:' : 'Total Payable at Counter:'}
                    </span>
                    <Badge variant={paymentMethod === 'ONLINE' ? 'blue' : 'green'} size="sm">
                      {paymentMethod === 'ONLINE' ? 'Razorpay Online' : 'Pay at Shop'}
                    </Badge>
                  </div>
                  <span className="text-xl font-bold text-[var(--text)] mt-0.5 block tabular-nums">
                    {currencySymbol} {formatPrice(draftOrder?.totalAmount)}
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  onClick={handleConfirmOrder}
                  className="px-6 min-h-[44px]"
                >
                  <span>
                    {paymentMethod === 'ONLINE'
                      ? `Pay Online (${currencySymbol} ${formatPrice(draftOrder?.totalAmount)})`
                      : 'Submit Order (Pay at Counter)'}
                  </span>
                  <ArrowRight size={16} strokeWidth={1.75} />
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </main>

      {/* Mobile Sticky Bottom Action Bar */}
      {hasFiles && (
        <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden bg-[var(--surface)] border-t border-[var(--border)] p-3 px-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block leading-tight">Total Amount</span>
              <span className="text-lg font-bold text-[var(--text)] tabular-nums leading-tight">
                {currencySymbol} {formatPrice(draftOrder?.totalAmount)}
              </span>
            </div>
            <Button
              variant="primary"
              size="md"
              loading={submitting}
              onClick={handleConfirmOrder}
              className="flex-1 min-h-[44px] text-xs font-semibold"
            >
              <span>{paymentMethod === 'ONLINE' ? 'Pay Online' : 'Submit Order'}</span>
              <ArrowRight size={15} strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden border border-[var(--border)]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} strokeWidth={1.75} className="text-[#0E7490] shrink-0" />
                <h3 className="font-semibold text-[var(--text)] text-sm truncate">
                  {previewFile.originalName}
                </h3>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                aria-label="Close preview"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 bg-[var(--bg)] p-4 overflow-auto flex items-center justify-center min-h-[350px]">
              {previewFile.mimeType === 'application/pdf' ? (
                <iframe
                  src={`/api/v1/customer/files/${previewFile.publicId || previewFile.id}/preview?sessionToken=${sessionToken}#toolbar=0`}
                  title={previewFile.originalName}
                  className="w-full h-[500px] border-0 rounded-lg bg-white shadow-xs"
                />
              ) : previewFile.mimeType?.startsWith('image/') ? (
                <img
                  src={`/api/v1/customer/files/${previewFile.publicId || previewFile.id}/preview?sessionToken=${sessionToken}`}
                  alt={previewFile.originalName}
                  className="max-h-[500px] max-w-full object-contain rounded-lg shadow-xs"
                />
              ) : (
                <div className="text-center p-8">
                  <File size={40} strokeWidth={1.5} className="text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-xs font-medium text-[var(--text)]">{previewFile.originalName}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Preview not supported for this file format in browser. Document is queued for native printing.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-[var(--surface)] border-t border-[var(--border)] flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setPreviewFile(null)} className="min-h-[36px]">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
