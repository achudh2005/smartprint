import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  UploadCloud, FileText, CheckCircle2, AlertCircle, X, Eye,
  Plus, Minus, Settings2, Sparkles, Store, Clock, MapPin,
  Phone, ArrowRight, RefreshCw, Layers, ShieldCheck, File,
  Repeat, Ban, Info
} from 'lucide-react'
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
  const [customerNotes, setCustomerNotes] = useState('')
  const [expiryOption, setExpiryOption] = useState('1h')
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

  // 2. Handle File Uploads
  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0 || !sessionToken) return

    const filesArray = Array.from(fileList)
    const acceptedFormats = shop.settings.acceptedFormats
    const maxBytes = shop.settings.maxUploadSizeMb * 1024 * 1024

    // Pre-flight client checks
    for (const f of filesArray) {
      const ext = f.name.split('.').pop().toLowerCase()
      if (!acceptedFormats.includes(ext)) {
        toast.error(`"${f.name}" is not accepted. Allowed: ${acceptedFormats.join(', ')}`)
        return
      }
      if (f.size > maxBytes) {
        toast.error(`"${f.name}" exceeds the ${shop.settings.maxUploadSizeMb} MB limit.`)
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
    }

    // Optimistic UI update
    setDraftOrder((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        f.publicId === filePublicId ? { ...f, printConfiguration: updatedConfig } : f
      ),
    }))

    try {
      const { data } = await api.put(
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

    try {
      setSubmitting(true)
      const { data } = await api.post(`/customer/sessions/${sessionToken}/confirm`, {
        notes: customerNotes,
        expiryOption,
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
    if (!bytes || bytes === '0') return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(Number(bytes)) / Math.log(k))
    return parseFloat((Number(bytes) / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-600 font-medium">Connecting to print shop...</p>
        </div>
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-surface-200 text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900 mb-2">Shop Unavailable</h1>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="primary">
            <RefreshCw size={16} /> Try Again
          </Button>
        </div>
      </div>
    )
  }

  const currencySymbol = shop.settings.currency === 'INR' ? '₹' : shop.settings.currency
  const activeFile = draftOrder?.files?.[activeConfigIndex] || draftOrder?.files?.[0]

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-24 transition-colors duration-200">
      {/* ── Top Shop Brand Header ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-surface-200 dark:border-slate-800 sticky top-0 z-20 shadow-xs transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name} className="w-10 h-10 rounded-xl object-cover border border-surface-200 dark:border-slate-700" />
            ) : (
              <div className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-xs">
                {shop.name[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{shop.name}</h1>
                <Badge variant="green" size="sm">Online</Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {shop.shopCode}</p>
            </div>
          </div>

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
            <div className="text-right">
              <span className="text-xs text-slate-400 dark:text-slate-500 block">Est. Total</span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {currencySymbol} {draftOrder?.totalAmount?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Shop Info & Instructions */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-surface-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-600 text-xs">
              <MapPin size={14} className="text-slate-400" />
              <span>{shop.address || 'In-store Print Counter'}</span>
            </div>
            {shop.contactPhone && (
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <Phone size={14} className="text-slate-400" />
                <span>{shop.contactPhone}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-surface-100 text-slate-600 px-2.5 py-1 rounded-lg">
              Max: <strong className="text-slate-800">{shop.settings.maxUploadSizeMb} MB</strong>
            </span>
            <span className="bg-surface-100 text-slate-600 px-2.5 py-1 rounded-lg">
              Formats: <strong className="text-slate-800">{shop.settings.acceptedFormats.slice(0, 4).join(', ').toUpperCase()}</strong>
            </span>
          </div>
        </div>

        {/* ── Document Upload Drag & Drop Area ── */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-primary-500 bg-primary-50/50 scale-[1.01]'
              : 'border-surface-300 bg-white hover:border-primary-400 hover:bg-surface-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={shop.settings.acceptedFormats.map((ext) => `.${ext}`).join(',')}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <input
            ref={replaceInputRef}
            type="file"
            accept={shop.settings.acceptedFormats.map((ext) => `.${ext}`).join(',')}
            className="hidden"
            onChange={handleFileReplacement}
          />

          <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            {uploading ? (
              <Spinner size="md" />
            ) : (
              <UploadCloud size={28} />
            )}
          </div>

          <h3 className="text-base font-semibold text-slate-800 mb-1">
            {uploading ? 'Processing documents...' : 'Tap or Drag documents here to print'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            PDF, Word DOCX, JPEG, PNG, or Text. Multiple files supported.
          </p>

          {uploading ? (
            <div className="space-y-3">
              <div className="w-48 mx-auto bg-surface-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary-600 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCancelUpload(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <Ban size={13} /> Cancel Upload
              </button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
              Browse Files
            </Button>
          )}
        </div>

        {/* ── Uploaded Documents List ── */}
        {draftOrder?.files && draftOrder.files.length > 0 && (
          <div className="space-y-4">
            {uploadSuccessMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>{uploadSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadSuccessMessage('')}
                  className="text-emerald-600 hover:text-emerald-800 p-1 rounded-md"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-primary-600" />
                Uploaded Documents ({draftOrder.files.length})
              </h2>
              <span className="text-xs text-slate-500">Configure settings for each file below</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {draftOrder.files.map((file, idx) => {
                const config = file.printConfiguration || {}
                const isConfigActive = activeFile?.publicId === file.publicId
                const isReady = file.status === 'READY'

                return (
                  <Card
                    key={file.publicId}
                    className={`transition-all ${isConfigActive ? 'ring-2 ring-primary-500 shadow-sm' : ''}`}
                  >
                    <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* File Icon & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center text-primary-600 shrink-0">
                          <File size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate max-w-xs sm:max-w-sm">
                            {file.originalName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>{formatBytes(file.fileSizeBytes)}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-700">
                              {file.pageCount || 1} {file.pageCount === 1 ? 'page' : 'pages'}
                            </span>
                            <span>•</span>
                            <Badge variant={isReady ? 'green' : 'red'} size="sm">
                              {file.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* File Action Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right sm:mr-3">
                          <span className="text-xs text-slate-400 block sm:hidden">Document Price</span>
                          <span className="text-sm font-bold text-slate-900">
                            {currencySymbol} {config.calculatedTotal?.toFixed(2) || '0.00'}
                          </span>
                        </div>

                        {/* Preview */}
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-surface-100 rounded-lg"
                          title="Preview Document"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Replace Document */}
                        <button
                          type="button"
                          onClick={() => triggerReplace(file.publicId)}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-surface-100 rounded-lg"
                          title="Replace Document"
                        >
                          <Repeat size={16} />
                        </button>

                        {/* Configure Drawer/Toggle */}
                        <Button
                          variant={isConfigActive ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setActiveConfigIndex(idx)}
                        >
                          <Settings2 size={15} />
                          {isConfigActive ? 'Configuring' : 'Configure'}
                        </Button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.publicId)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="Remove file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* ── Inline Configuration Details (if active) ── */}
                    {isConfigActive && (
                      <div className="bg-surface-50 border-t border-surface-200 p-4 sm:p-5 rounded-b-xl space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                          {/* Copies */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">Copies</label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleConfigUpdate(file.publicId, 'copies', Math.max(1, (config.copies || 1) - 1))}
                                className="w-8 h-8 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-slate-600 hover:bg-surface-100 font-bold"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-10 text-center font-bold text-sm text-slate-800">
                                {config.copies || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleConfigUpdate(file.publicId, 'copies', (config.copies || 1) + 1)}
                                className="w-8 h-8 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-slate-600 hover:bg-surface-100 font-bold"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Color Mode */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">Color Mode</label>
                            <select
                              value={config.colorMode || 'BLACK_WHITE'}
                              onChange={(e) => handleConfigUpdate(file.publicId, 'colorMode', e.target.value)}
                              className="input text-xs py-1.5"
                            >
                              <option value="BLACK_WHITE">Black & White</option>
                              <option value="COLOR">Full Color</option>
                              <option value="GRAYSCALE">Grayscale</option>
                            </select>
                          </div>

                          {/* Paper Size */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">Paper Size</label>
                            <select
                              value={config.paperSize || 'A4'}
                              onChange={(e) => handleConfigUpdate(file.publicId, 'paperSize', e.target.value)}
                              className="input text-xs py-1.5"
                            >
                              <option value="A4">A4 (Standard)</option>
                              <option value="A3">A3 (Large)</option>
                              <option value="LEGAL">Legal</option>
                              <option value="LETTER">Letter</option>
                            </select>
                          </div>

                          {/* Paper Type */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">Paper Type</label>
                            <select
                              value={config.paperType || 'NORMAL'}
                              onChange={(e) => handleConfigUpdate(file.publicId, 'paperType', e.target.value)}
                              className="input text-xs py-1.5"
                            >
                              <option value="NORMAL">Normal (75 GSM)</option>
                              <option value="PREMIUM">Premium Bond (100 GSM)</option>
                              <option value="PHOTO">Glossy Photo</option>
                              <option value="BOND">Heavy Cardstock</option>
                            </select>
                          </div>

                          {/* Duplex / Sides */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">Printing Sides</label>
                            <select
                              value={config.duplexMode || 'SIMPLEX'}
                              onChange={(e) => handleConfigUpdate(file.publicId, 'duplexMode', e.target.value)}
                              className="input text-xs py-1.5"
                            >
                              <option value="SIMPLEX">Single-Sided</option>
                              <option value="DUPLEX_LONG_EDGE">Double-Sided (Flip Long Edge)</option>
                              <option value="DUPLEX_SHORT_EDGE">Double-Sided (Flip Short Edge)</option>
                            </select>
                          </div>
                        </div>

                        {/* Page Range & Orientation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-surface-200/60">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">
                              Pages to Print <span className="font-normal text-slate-400">("ALL" or e.g. "1-5, 8")</span>
                            </label>
                            <input
                              type="text"
                              defaultValue={config.pageRange || 'ALL'}
                              onBlur={(e) => handleConfigUpdate(file.publicId, 'pageRange', e.target.value)}
                              placeholder="ALL"
                              className="input text-xs py-1.5"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">Orientation</label>
                            <div className="flex gap-2">
                              {['PORTRAIT', 'LANDSCAPE'].map((ori) => (
                                <button
                                  key={ori}
                                  type="button"
                                  onClick={() => handleConfigUpdate(file.publicId, 'orientation', ori)}
                                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                                    (config.orientation || 'PORTRAIT') === ori
                                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                                      : 'bg-white border-surface-200 text-slate-600 hover:bg-surface-100'
                                  }`}
                                >
                                  {ori === 'PORTRAIT' ? 'Portrait' : 'Landscape'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Additional Services for this file */}
                        {shop.additionalServices && shop.additionalServices.length > 0 && (
                          <div className="pt-3 border-t border-surface-200/60">
                            <label className="text-xs font-semibold text-slate-700 block mb-2">
                              Additional Services for this document:
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
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                      isAttached
                                        ? 'bg-primary-600 text-white border-primary-600'
                                        : 'bg-white text-slate-700 border-surface-300 hover:border-slate-400'
                                    }`}
                                  >
                                    <span>{svc.name} (+{currencySymbol}{Number(svc.price).toFixed(2)})</span>
                                    {isAttached ? <CheckCircle2 size={13} /> : <Plus size={13} />}
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

        {/* ── Order Summary & Notes ── */}
        {draftOrder?.files && draftOrder.files.length > 0 && (
          <Card className="bg-white border border-surface-200 shadow-xs">
            <CardBody className="space-y-4">
              {/* File Lifetime Expiry Option Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-500" />
                    <span>File Privacy & Lifetime Expiry</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Auto-purged from server after expiry</span>
                </div>
                <select
                  value={expiryOption}
                  onChange={(e) => setExpiryOption(e.target.value)}
                  className="input text-xs font-medium bg-white"
                >
                  {(shop.settings?.enabledExpiryOptions || ['15m', '1h', '3h', '8h']).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === '15m' ? '15 Minutes (Maximum Privacy)' :
                       opt === '1h' ? '1 Hour (Recommended)' :
                       opt === '3h' ? '3 Hours' :
                       opt === '8h' ? '8 Hours' : `${opt}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Special Instructions or Notes (Optional)
                </label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="e.g. Please staple top-left corner, or call when ready..."
                  rows={2}
                  className="input text-xs"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 border-t border-surface-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 block">
                      {shop.settings?.paymentEnabled ? 'Total Amount (Online Payment)' : 'Total Payable at Counter'}
                    </span>
                    <Badge variant={shop.settings?.paymentEnabled ? 'blue' : 'gray'}>
                      {shop.settings?.paymentEnabled ? 'Razorpay Online' : 'Pay at Shop'}
                    </Badge>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 mt-0.5 block">
                    {currencySymbol} {draftOrder?.totalAmount?.toFixed(2) || '0.00'}
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  onClick={handleConfirmOrder}
                  className="px-6"
                >
                  <span>{shop.settings?.paymentEnabled ? 'Pay & Submit Order' : 'Submit Print Request'}</span>
                  <ArrowRight size={18} />
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </main>

      {/* ── Document Preview Modal ── */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-4 border-b border-surface-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary-600" />
                <h3 className="font-semibold text-slate-900 text-sm truncate max-w-md">
                  {previewFile.originalName}
                </h3>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-surface-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 bg-surface-100 p-4 overflow-auto flex items-center justify-center min-h-[400px]">
              {previewFile.mimeType === 'application/pdf' ? (
                <iframe
                  src={`/api/v1/customer/files/${previewFile.publicId || previewFile.id}/preview?sessionToken=${sessionToken}#toolbar=0`}
                  title={previewFile.originalName}
                  className="w-full h-[550px] border-0 rounded-lg bg-white shadow-xs"
                />
              ) : previewFile.mimeType?.startsWith('image/') ? (
                <img
                  src={`/api/v1/customer/files/${previewFile.publicId || previewFile.id}/preview?sessionToken=${sessionToken}`}
                  alt={previewFile.originalName}
                  className="max-h-[550px] max-w-full object-contain rounded-lg shadow-xs"
                />
              ) : (
                <div className="text-center p-8">
                  <File size={48} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">{previewFile.originalName}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Preview not supported for this file format in browser. Document is queued for native printing.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-surface-200 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setPreviewFile(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
