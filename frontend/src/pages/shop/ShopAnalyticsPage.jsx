import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  HardDrive,
  CreditCard,
  FileText,
  Printer,
  CheckCircle2,
  RefreshCw,
  PrinterIcon,
} from 'lucide-react'
import ShopNavTabs from '../../components/shop/ShopNavTabs'
import api from '../../lib/api'

export default function ShopAnalyticsPage() {
  const { shopId } = useParams()
  const [range, setRange] = useState('30d')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/shops/${shopId}/analytics`, {
        params: { range },
      })
      setAnalytics(res.data.data)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [shopId, range])

  const handleExportCsv = async () => {
    try {
      const res = await api.get(`/shops/${shopId}/analytics/export/csv`, {
        params: { range },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `smartprint_report_shop_${shopId}_${range}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to export CSV report')
    }
  }

  const handlePrintPdf = () => {
    window.print()
  }

  const kpis = analytics?.kpis || {}
  const breakdowns = analytics?.breakdowns || {}
  const trends = analytics?.trends || []

  // Formatting bytes helper
  const formatBytes = (bytesStr) => {
    const bytes = Number(bytesStr || 0)
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    if (i < 0 || i >= sizes.length) return `${bytes} B`
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="text-primary-600" size={26} />
            Business Reports & Print Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Verified financial revenue, physical print output, and operational breakdowns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe selector */}
          <div className="flex items-center bg-white border border-surface-200 rounded-xl p-1 text-xs font-semibold shadow-xs">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setRange(item.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  range === item.id
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadAnalytics}
            className="p-2 bg-white border border-surface-200 text-slate-600 rounded-xl hover:bg-surface-50 shadow-xs"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-surface-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-surface-50 shadow-xs"
          >
            <Download size={14} />
            Export CSV / Excel
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 shadow-xs"
          >
            <PrinterIcon size={14} />
            Print Report (PDF)
          </button>
        </div>
      </div>

      <div className="print:hidden">
        <ShopNavTabs shopId={shopId} />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Verified Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{kpis.period?.totalRevenue || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Online: ₹{kpis.period?.onlineRevenue || 0}</span>
            <span>Counter: ₹{kpis.period?.counterRevenue || 0}</span>
          </div>
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pages Physically Printed</span>
            <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Printer size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {kpis.period?.totalPagesPrinted || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>B&W: {kpis.period?.bwPages || 0}</span>
            <span>Color: {kpis.period?.colorPages || 0}</span>
          </div>
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Orders In Timeframe</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {kpis.period?.totalOrders || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span className="text-emerald-600 font-medium">Completed: {kpis.period?.completedOrders || 0}</span>
            <span className="text-amber-600 font-medium">Pending: {kpis.period?.pendingOrders || 0}</span>
          </div>
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Storage & Retention</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <HardDrive size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatBytes(kpis.storage?.activeBytes)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Active: {formatBytes(kpis.storage?.activeBytes)}</span>
            <span className="text-emerald-600">Purged: {formatBytes(kpis.storage?.purgedBytes)}</span>
          </div>
        </div>
      </div>

      {/* Daily Volume & Revenue Trend Table */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-xs mb-8">
        <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary-600" />
          Revenue & Print Activity Trends
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Day-by-day revenue accruals and physical pages printed during this selected period.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 text-slate-500 border-b border-surface-100 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-center">New Orders</th>
                <th className="py-2.5 px-4 text-center">Pages Printed</th>
                <th className="py-2.5 px-4 text-right">Verified Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700 font-medium">
              {trends.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No trend activity recorded in this period.
                  </td>
                </tr>
              ) : (
                trends.slice(-14).map((t) => (
                  <tr key={t.date} className="hover:bg-surface-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-800">{t.date}</td>
                    <td className="py-2.5 px-4 text-center">{t.orders}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-primary-600">{t.pages}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">₹{Number(t.revenue || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Color Distribution */}
        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Layers size={16} className="text-primary-600" />
            Color vs B&W Usage
          </h3>
          <div className="space-y-3">
            {breakdowns.colorDistribution?.map((item) => {
              const total = (kpis.period?.totalPagesPrinted || 1)
              const pct = Math.round((item.pages / total) * 100) || 0
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                    <span>{item.label}</span>
                    <span>{item.pages} pgs ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.label === 'Color' ? 'bg-indigo-600' : 'bg-slate-700'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Paper Type Usage */}
        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-primary-600" />
            Paper Type Distribution
          </h3>
          <div className="space-y-2.5">
            {breakdowns.paperTypeUsage?.map((item) => (
              <div key={item.type} className="flex items-center justify-between text-xs py-1.5 border-b border-surface-100 last:border-0">
                <span className="font-semibold text-slate-700 capitalize">{item.type.toLowerCase()}</span>
                <span className="font-bold text-slate-900">{item.pages} pages</span>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Services */}
        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Additional Finishing Services
          </h3>
          <div className="space-y-2.5">
            {breakdowns.serviceUsage && breakdowns.serviceUsage.length > 0 ? (
              breakdowns.serviceUsage.map((item) => (
                <div key={item.service} className="flex items-center justify-between text-xs py-1.5 border-b border-surface-100 last:border-0">
                  <span className="font-semibold text-slate-700">{item.service}</span>
                  <span className="font-bold text-primary-600">{item.count} orders</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">No finishing services ordered in this period.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
