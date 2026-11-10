import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  DollarSign, Plus, Trash2, Save, Layers, Sparkles, Check,
  AlertCircle, RefreshCw
} from 'lucide-react'
import { PageHeader, Card, CardHeader, CardBody, Button, Spinner, Badge } from '../../components/ui'
import ShopNavTabs from '../../components/shop/ShopNavTabs'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function ShopPricingPage() {
  const { shopId } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Default matrix
  const [rules, setRules] = useState([
    { paperSize: 'A4', colorMode: 'BLACK_WHITE', duplexMode: 'SIMPLEX', pricePerPage: 2.0, name: 'A4 B&W Single-Sided' },
    { paperSize: 'A4', colorMode: 'BLACK_WHITE', duplexMode: 'DUPLEX_LONG_EDGE', pricePerPage: 1.5, name: 'A4 B&W Double-Sided' },
    { paperSize: 'A4', colorMode: 'COLOR', duplexMode: 'SIMPLEX', pricePerPage: 10.0, name: 'A4 Color Single-Sided' },
    { paperSize: 'A4', colorMode: 'COLOR', duplexMode: 'DUPLEX_LONG_EDGE', pricePerPage: 8.0, name: 'A4 Color Double-Sided' },
    { paperSize: 'A3', colorMode: 'BLACK_WHITE', duplexMode: 'SIMPLEX', pricePerPage: 5.0, name: 'A3 B&W Single-Sided' },
    { paperSize: 'A3', colorMode: 'COLOR', duplexMode: 'SIMPLEX', pricePerPage: 20.0, name: 'A3 Color Single-Sided' },
    { paperSize: 'LEGAL', colorMode: 'BLACK_WHITE', duplexMode: 'SIMPLEX', pricePerPage: 3.0, name: 'Legal B&W Single-Sided' },
    { paperSize: 'LEGAL', colorMode: 'COLOR', duplexMode: 'SIMPLEX', pricePerPage: 12.0, name: 'Legal Color Single-Sided' },
  ])

  // Additional Services
  const [services, setServices] = useState([])
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [rulesRes, servicesRes] = await Promise.all([
          api.get(`/shops/${shopId}/pricing-rules`),
          api.get(`/shops/${shopId}/services`),
        ])

        if (rulesRes.data.data.rules?.length > 0) {
          setRules(rulesRes.data.data.rules)
        }
        setServices(servicesRes.data.data.services || [])
      } catch (err) {
        toast.error('Failed to load pricing data.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [shopId])

  const handlePriceChange = (index, value) => {
    setRules((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], pricePerPage: parseFloat(value) || 0 }
      return copy
    })
  }

  const handleSaveRules = async () => {
    try {
      setSaving(true)
      await api.put(`/shops/${shopId}/pricing-rules`, { rules })
      toast.success('Pricing rules updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update pricing rules.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddService = async (e) => {
    e.preventDefault()
    if (!newServiceName || !newServicePrice) {
      toast.error('Please enter service name and price.')
      return
    }

    try {
      const { data } = await api.post(`/shops/${shopId}/services`, {
        name: newServiceName,
        price: parseFloat(newServicePrice),
      })
      setServices((prev) => [...prev, data.data.service])
      setNewServiceName('')
      setNewServicePrice('')
      toast.success('Service added!')
    } catch (err) {
      toast.error('Failed to add service.')
    }
  }

  const handleDeleteService = async (serviceId) => {
    try {
      await api.delete(`/shops/${shopId}/services/${serviceId}`)
      setServices((prev) => prev.filter((s) => s.id !== serviceId))
      toast.success('Service removed.')
    } catch (err) {
      toast.error('Failed to delete service.')
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
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Print Pricing & Additional Services"
        description="Set standard rates per page and add optional finishing services (lamination, binding, etc.)."
      />

      <ShopNavTabs shopId={shopId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Document Printing Rates Matrix ── */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text)] text-sm">Base Rates Per Page (₹)</h3>
              <Badge variant="blue" dot>Dynamic Calculator</Badge>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-hover)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px] border-b border-[var(--border)]">
                  <tr>
                    <th className="py-2.5 px-4">Size & Mode</th>
                    <th className="py-2.5 px-4">Sides</th>
                    <th className="py-2.5 px-4 text-right">Price Per Page (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rules.map((rule, idx) => (
                    <tr key={idx} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-11">
                      <td className="py-2.5 px-4 font-medium text-[var(--text)]">
                        {rule.name || `${rule.paperSize} ${rule.colorMode}`}
                      </td>
                      <td className="py-2.5 px-4 text-[var(--text-muted)]">
                        {rule.duplexMode?.includes('DUPLEX') ? 'Double-Sided' : 'Single-Sided'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 max-w-[120px]">
                          <span className="text-[var(--text-muted)]">₹</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={rule.pricePerPage}
                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                            className="input py-1 px-2 text-xs font-semibold tabular-nums text-right h-8"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* ── Additional Finishing Services ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers size={15} strokeWidth={1.75} className="text-[#0E7490]" />
                <h3 className="font-semibold text-[var(--text)] text-sm">Finishing Services</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Existing Services List */}
              <div className="space-y-2">
                {services.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-2 text-center">No additional services added yet.</p>
                ) : (
                  services.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[var(--text)] block">{svc.name}</span>
                        <span className="text-[var(--text-muted)] font-mono tabular-nums">₹ {Number(svc.price || 0).toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(svc.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-red-600 rounded-md transition-colors duration-150"
                        title="Remove service"
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Service Form */}
              <form onSubmit={handleAddService} className="pt-3 border-t border-[var(--border)] space-y-3">
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Add Service (e.g. Spiral Binding)</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Service Name (e.g. Lamination)"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="input text-xs"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Price (₹)"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      className="input text-xs tabular-nums"
                    />
                    <Button variant="secondary" size="sm" type="submit" className="shrink-0">
                      <Plus size={13} strokeWidth={1.75} /> Add
                    </Button>
                  </div>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-6 sm:-mx-6 lg:-mx-8 px-6 py-3.5 bg-[var(--surface)]/95 backdrop-blur-xs border-t border-[var(--border)] flex items-center justify-between shadow-card">
        <span className="text-xs text-[var(--text-muted)]">
          Ensure you click save to apply page rates to live customer calculations.
        </span>
        <Button variant="primary" loading={saving} onClick={handleSaveRules}>
          <Save size={15} strokeWidth={1.75} /> Save Pricing Rules
        </Button>
      </div>
    </div>
  )
}
