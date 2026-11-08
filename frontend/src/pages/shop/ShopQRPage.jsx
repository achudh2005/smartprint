import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  QrCode, Download, Copy, Check, Printer, RefreshCw,
  ExternalLink, ArrowLeft, Store, ShieldAlert, Sparkles
} from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, Button, Spinner, Alert } from '../../components/ui'
import ShopNavTabs from '../../components/shop/ShopNavTabs'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function ShopQRPage() {
  const { shopId } = useParams()
  const [qrData, setQrData] = useState(null)
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchQR = async () => {
    try {
      setLoading(true)
      const [qrRes, shopRes] = await Promise.all([
        api.get(`/shops/${shopId}/qr`, {
          params: { origin: window.location.origin }
        }),
        api.get(`/shops/${shopId}`),
      ])
      setQrData(qrRes.data.data)
      setShop(shopRes.data.data.shop)
    } catch (err) {
      toast.error('Failed to load shop QR code.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQR()
  }, [shopId])

  // Get effective public URL for customer portal
  const effectiveUrl = qrData?.url && !qrData.url.includes('localhost')
    ? qrData.url
    : (shop?.shopCode ? `${window.location.origin}/s/${shop.shopCode}` : (qrData?.url || ''))

  // Copy link
  const copyLink = () => {
    const urlToCopy = effectiveUrl || qrData?.url
    if (!urlToCopy) return
    navigator.clipboard.writeText(urlToCopy)
    setCopied(true)
    toast.success('Customer print portal URL copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  // Download PNG
  const downloadPNG = () => {
    if (!qrData?.pngDataUrl) return
    const a = document.createElement('a')
    a.href = qrData.pngDataUrl
    a.download = `SmartPrint_${shop?.shopCode || 'QR'}.png`
    a.click()
    toast.success('Downloaded PNG QR Code!')
  }

  // Download SVG
  const downloadSVG = () => {
    if (!qrData?.svg) return
    const blob = new Blob([qrData.svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SmartPrint_${shop?.shopCode || 'QR'}.svg`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded SVG QR Code!')
  }

  // Regenerate Code
  const handleRegenerate = async () => {
    try {
      setRegenerating(true)
      const { data } = await api.post(`/shops/${shopId}/qr/regenerate`, {}, {
        params: { origin: window.location.origin }
      })
      setQrData(data.data)
      setShop(data.data.shop)
      setShowConfirm(false)
      toast.success('Shop QR Code regenerated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to regenerate QR code.')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storefront QR Code & Customer Portal"
        description="Customers can scan this code with their smartphone camera to upload documents without installing an app."
        action={
          <div className="flex items-center gap-2">
            <Link to={`/s/${shop?.shopCode}`} target="_blank">
              <Button variant="secondary" size="sm">
                <ExternalLink size={15} /> Open Portal
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              <Printer size={15} /> Print Flyer
            </Button>
          </div>
        }
      />

      <ShopNavTabs shopId={shopId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main QR Card ── */}
        <Card className="lg:col-span-2">
          <CardBody className="p-8 flex flex-col sm:flex-row items-center gap-8">
            {/* The QR Code Image */}
            <div className="bg-white p-4 rounded-3xl border-2 border-surface-200 shadow-md flex items-center justify-center shrink-0">
              <img
                src={qrData?.pngDataUrl}
                alt="Shop QR Code"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
              />
            </div>

            {/* Details & Actions */}
            <div className="space-y-5 flex-1 min-w-0">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Unique Shop Code
                </span>
                <span className="text-3xl font-mono font-black text-slate-900 tracking-wider">
                  {shop?.shopCode}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Active and ready for customer scanning.
                </p>
              </div>

              {/* Direct Link Box */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Direct Customer URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={effectiveUrl}
                    className="input text-xs font-mono bg-surface-50 text-slate-700 select-all"
                  />
                  <Button variant="secondary" size="sm" onClick={copyLink} className="shrink-0">
                    {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-wrap gap-2.5 pt-2 border-t border-surface-100">
                <Button variant="secondary" size="sm" onClick={downloadPNG}>
                  <Download size={14} /> Download PNG (High Res)
                </Button>
                <Button variant="secondary" size="sm" onClick={downloadSVG}>
                  <Download size={14} /> Download SVG (Vector)
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── Flyer / Table Tent Preview Card ── */}
        <Card className="bg-primary-50/40 border-primary-100">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Storefront Display Flyer</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4 text-xs text-slate-600">
            <p>
              Click <strong>"Print Flyer"</strong> above to print a counter display sign for your shop counter or front window.
            </p>
            <div className="bg-white p-4 rounded-xl border border-primary-200/60 shadow-xs space-y-2">
              <div className="font-bold text-slate-900 text-center text-sm">{shop?.name}</div>
              <div className="text-center text-primary-600 font-semibold">Self-Service Cloud Printing</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                <li>1. Scan QR with your phone</li>
                <li>2. Upload your PDF or images</li>
                <li>3. Pick up at our counter</li>
              </ul>
            </div>
            <p className="text-slate-400">
              No app download or customer sign-up needed. Fast, private and contactless.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ── Danger Zone: Regenerate Code ── */}
      <Card className="border-red-100">
        <CardBody className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-red-900 text-sm">Regenerate Shop QR Code</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Generating a new code will immediately invalidate previously printed flyers and old customer links. Use this only if your QR code was compromised.
            </p>
          </div>

          {showConfirm ? (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                loading={regenerating}
                onClick={handleRegenerate}
              >
                Yes, Regenerate
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
              <RefreshCw size={14} /> Regenerate QR Code
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
