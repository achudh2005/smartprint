import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Settings, Store, Upload, Clock, Image, Save, ArrowLeft, CreditCard } from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, Button, Toggle, Alert, Spinner } from '../../components/ui'
import ShopNavTabs from '../../components/shop/ShopNavTabs'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function ShopSettingsPage() {
  const { user } = useAuth()
  const { shopId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [shop, setShop] = useState(null)
  const [settings, setSettings] = useState(null)
  const [shopDetails, setShopDetails] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/shops/${shopId}`)
      .then(({ data }) => {
        const s = data.data.shop
        setShop(s)
        setSettings(s.shopSettings || {})
        setShopDetails({
          name: s.name || '',
          description: s.description || '',
          address: s.address || '',
          phone: s.phone || '',
          email: s.email || '',
        })
        if (s.logoUrl) {
          setLogoPreview(s.logoUrl)
        }
      })
      .catch(() => setError('Failed to load shop settings.'))
      .finally(() => setLoading(false))
  }, [shopId])

  const handleToggle = (key) => (val) => {
    setSettings((prev) => ({ ...prev, [key]: val }))
  }

  const handleExpiryOptionToggle = (option) => {
    const current = (settings?.enabledExpiryOptions || '15m,1h,3h,8h')
      .split(',')
      .map((o) => o.trim())

    let updated
    if (current.includes(option)) {
      if (current.length === 1) {
        toast.error('At least one expiry option must be enabled.')
        return
      }
      updated = current.filter((o) => o !== option)
    } else {
      updated = [...current, option]
    }

    setSettings((prev) => ({
      ...prev,
      enabledExpiryOptions: updated.join(','),
      defaultExpiryOption: updated.includes(prev.defaultExpiryOption) ? prev.defaultExpiryOption : updated[0],
    }))
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
        toast.error('Only JPG, PNG, WEBP and SVG images are allowed')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo image must be under 2MB')
        return
      }
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleUploadLogo = async () => {
    if (!logoFile) return
    setUploadingLogo(true)
    const formData = new FormData()
    formData.append('logo', logoFile)

    try {
      const res = await api.post(`/shops/${shopId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Shop logo uploaded successfully!')
      setShop((prev) => ({ ...prev, logoUrl: res.data.data.logoUrl }))
      setLogoFile(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch(`/shops/${shopId}`, shopDetails)
      await api.patch(`/shops/${shopId}/settings`, settings)
      toast.success('Shop details and settings saved successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (error) return <Alert type="error">{error}</Alert>
  if (!shop) return null

  const enabledOptions = (settings?.enabledExpiryOptions || '15m,1h,3h,8h')
    .split(',')
    .map((o) => o.trim())

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Shop Settings"
        description={`Manage identity, branding, printing options, privacy expiry, and payments for ${shop.name}`}
      />

      <ShopNavTabs shopId={shopId} />

      <div className="space-y-6 pb-20">
        {/* Branding & Logo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Image size={16} strokeWidth={1.75} className="text-[#0E7490]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">Shop Branding & Logo</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--surface-hover)] shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Shop Logo" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-8 h-8 text-[var(--text-muted)]" />
                )}
              </div>
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-sm font-semibold text-[var(--text)]">Store Logo</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Visible on your customer storefront page and print receipts. Max 2MB (PNG, JPG, SVG).
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select New Logo
                  </Button>
                  {logoFile && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={uploadingLogo}
                      onClick={handleUploadLogo}
                    >
                      Upload Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Shop Info & Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store size={16} strokeWidth={1.75} className="text-[#0E7490]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">Storefront Profile</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={shopDetails.name}
                  onChange={(e) => setShopDetails((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Shop Code
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  className="input bg-[var(--surface-hover)] text-[var(--text-muted)] font-mono cursor-not-allowed opacity-80"
                  value={shop.shopCode}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Description / Tagline
              </label>
              <input
                type="text"
                className="input"
                placeholder="High quality color & xerox printing"
                value={shopDetails.description}
                onChange={(e) => setShopDetails((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="+1 234 567 890"
                  value={shopDetails.phone}
                  onChange={(e) => setShopDetails((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  className="input"
                  placeholder="contact@smartprint.com"
                  value={shopDetails.email}
                  onChange={(e) => setShopDetails((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Physical Address
              </label>
              <textarea
                rows={2}
                className="input py-2 h-auto"
                placeholder="Building, street, city..."
                value={shopDetails.address}
                onChange={(e) => setShopDetails((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
          </CardBody>
        </Card>

        {/* Operational Features */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings size={16} strokeWidth={1.75} className="text-[#0E7490]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">Operational Features</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <Toggle
              checked={settings?.manualPrintEnabled ?? true}
              onChange={handleToggle('manualPrintEnabled')}
              label="Manual Printing Workflow"
              description="Staff inspects, previews, downloads, and prints jobs using store equipment."
            />
            <div className="border-t border-[var(--border)]" />
            <Toggle
              checked={settings?.paymentEnabled || false}
              onChange={handleToggle('paymentEnabled')}
              label="Customer Online Payments"
              description="Require or accept online payment via Razorpay before jobs enter print queue."
            />
            <div className="border-t border-[var(--border)]" />
            <Toggle
              checked={settings?.directPrintEnabled || false}
              onChange={handleToggle('directPrintEnabled')}
              label="Direct Cloud Print Agent (Automated)"
              description="Dispatch accepted jobs directly to local print agent service."
            />
          </CardBody>
        </Card>

        {/* Razorpay Online Payment Gateway Configuration */}
        {settings?.paymentEnabled && (
          <Card className="border-[var(--border)] bg-[var(--accent-tint)]/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard size={16} strokeWidth={1.75} className="text-[#0E7490]" />
                <h2 className="text-sm font-semibold text-[var(--text)]">Razorpay Gateway Credentials</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-xs text-[var(--text-muted)]">
                Configure your shop's merchant API keys. If left empty, system defaults or test mock mode will be used.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    className="input font-mono text-xs"
                    placeholder="rzp_live_..."
                    value={settings?.razorpayKeyId || ''}
                    onChange={(e) => setSettings((p) => ({ ...p, razorpayKeyId: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Razorpay Key Secret
                  </label>
                  <input
                    type="password"
                    className="input font-mono text-xs"
                    placeholder="••••••••••••"
                    value={settings?.razorpayKeySecret || ''}
                    onChange={(e) => setSettings((p) => ({ ...p, razorpayKeySecret: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Razorpay Webhook Secret
                </label>
                <input
                  type="password"
                  className="input font-mono text-xs"
                  placeholder="Webhook secret for signature validation"
                  value={settings?.razorpayWebhookSecret || ''}
                  onChange={(e) => setSettings((p) => ({ ...p, razorpayWebhookSecret: e.target.value }))}
                />
              </div>
            </CardBody>
          </Card>
        )}

        {/* Automatic Expiry Options & Privacy Policies */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock size={16} strokeWidth={1.75} className="text-[#0E7490]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">Document Lifetime & Privacy Expiry</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Enabled Expiry Options for Customers
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: '15m', label: '15 Minutes', desc: 'Max privacy' },
                  { id: '1h', label: '1 Hour', desc: 'Standard' },
                  { id: '3h', label: '3 Hours', desc: 'Busy queues' },
                  { id: '8h', label: '8 Hours', desc: 'Full shift' },
                ].map(({ id, label, desc }) => {
                  const isChecked = enabledOptions.includes(id)
                  return (
                    <label
                      key={id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors duration-150 flex flex-col justify-between ${
                        isChecked
                          ? 'border-[#0E7490] bg-[var(--accent-tint)] text-[var(--text)] ring-1 ring-[#0E7490]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-[var(--text)]">{label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleExpiryOptionToggle(id)}
                          className="rounded text-[#0E7490] focus:ring-[#22D3EE]"
                        />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{desc}</span>
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Customers choose from these enabled options during upload. Documents are automatically purged when expired.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Default Expiry Option
                </label>
                <select
                  className="input"
                  value={settings?.defaultExpiryOption || '1h'}
                  onChange={(e) => setSettings((p) => ({ ...p, defaultExpiryOption: e.target.value }))}
                >
                  {enabledOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === '15m' ? '15 Minutes' : opt === '1h' ? '1 Hour' : opt === '3h' ? '3 Hours' : '8 Hours'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Max Allowed Expiry Limit (Hours)
                </label>
                <input
                  type="number"
                  className="input"
                  value={settings?.maxExpiryHours || 8}
                  min={1}
                  max={24}
                  onChange={(e) => setSettings((p) => ({ ...p, maxExpiryHours: parseInt(e.target.value, 10) || 8 }))}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Upload Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload size={16} strokeWidth={1.75} className="text-[#0E7490]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">File Upload Limits & Formats</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Max Upload Size (MB)
                </label>
                <input
                  type="number"
                  className="input"
                  value={settings?.maxUploadSizeMb || 50}
                  min={1}
                  max={500}
                  onChange={(e) => setSettings((p) => ({ ...p, maxUploadSizeMb: parseInt(e.target.value, 10) || 50 }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Accepted File Formats
                </label>
                <input
                  type="text"
                  className="input font-mono text-xs"
                  value={settings?.acceptedFormats || 'pdf,doc,docx,jpg,jpeg,png,ppt,pptx,txt'}
                  onChange={(e) => setSettings((p) => ({ ...p, acceptedFormats: e.target.value }))}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-6 sm:-mx-6 lg:-mx-8 px-6 py-3.5 bg-[var(--surface)]/95 backdrop-blur-xs border-t border-[var(--border)] flex items-center justify-between shadow-card">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(`/shops/${shopId}/dashboard`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Back to Dashboard
        </Button>

        <Button
          type="button"
          variant="primary"
          loading={saving}
          onClick={handleSave}
          className="flex items-center gap-2"
        >
          <Save size={15} strokeWidth={1.75} />
          Save All Changes
        </Button>
      </div>
    </div>
  )
}
