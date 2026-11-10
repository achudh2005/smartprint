import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  BarChart3,
  TrendingUp,
  Download,
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
    <div className="space-y-6 print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <BarChart3 size={18} strokeWidth={1.75} className="text-[#0E7490]" />
            Business Reports & Analytics
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Verified financial revenue, physical print output, and operational breakdowns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-lg p-0.5 text-xs font-medium">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setRange(item.id)}
                className={`px-3 py-1.5 rounded-md transition-colors duration-150 ${
                  range === item.id
                    ? 'bg-[#0E7490] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadAnalytics}
            className="p-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition-colors duration-150"
            title="Refresh"
          >
            <RefreshCw size={14} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-medium rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition-colors duration-150"
          >
            <Download size={13} strokeWidth={1.75} />
            Export CSV
          </button>

          <button
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0E7490] text-white text-xs font-medium rounded-lg hover:bg-[#155E75] transition-colors duration-150"
          >
            <PrinterIcon size={13} strokeWidth={1.75} />
            Print Report
          </button>
        </div>
      </div>

      <div className="print:hidden">
        <ShopNavTabs shopId={shopId} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Verified Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <TrendingUp size={13} strokeWidth={1.75} className="text-[var(--text-muted)]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tracking-tight tabular-nums">
            ₹{kpis.period?.totalRevenue || 0}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center justify-between">
            <span>Online: ₹{kpis.period?.onlineRevenue || 0}</span>
            <span>Counter: ₹{kpis.period?.counterRevenue || 0}</span>
          </div>
        </div>

        {/* Pages */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Pages Printed</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <Printer size={13} strokeWidth={1.75} className="text-[var(--text-muted)]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tracking-tight tabular-nums">
            {kpis.period?.totalPagesPrinted || 0}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center justify-between">
            <span>B&W: {kpis.period?.bwPages || 0}</span>
            <span>Color: {kpis.period?.colorPages || 0}</span>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Orders In Period</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <FileText size={13} strokeWidth={1.75} className="text-[var(--text-muted)]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tracking-tight tabular-nums">
            {kpis.period?.totalOrders || 0}
          </div>
          <div className="text-xs mt-2 flex items-center justify-between">
            <span className="text-green-600 dark:text-green-500 font-medium">Done: {kpis.period?.completedOrders || 0}</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">Pending: {kpis.period?.pendingOrders || 0}</span>
          </div>
        </div>

        {/* Storage */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Storage & Retention</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
              <HardDrive size={13} strokeWidth={1.75} className="text-[var(--text-muted)]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tracking-tight">
            {formatBytes(kpis.storage?.activeBytes)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center justify-between">
            <span>Active: {formatBytes(kpis.storage?.activeBytes)}</span>
            <span className="text-green-600 dark:text-green-500">Purged: {formatBytes(kpis.storage?.purgedBytes)}</span>
          </div>
        </div>
      </div>

      {/* Trend Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <TrendingUp size={14} strokeWidth={1.75} className="text-[#0E7490]" />
            Revenue & Print Activity Trends
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Day-by-day revenue accruals and pages printed in this period.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-hover)] text-[var(--text-muted)] border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-wider sticky top-0">
              <tr>
                <th className="py-2.5 px-5">Date</th>
                <th className="py-2.5 px-5 text-center">New Orders</th>
                <th className="py-2.5 px-5 text-center">Pages Printed</th>
                <th className="py-2.5 px-5 text-right">Verified Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
              {trends.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[var(--text-muted)]">
                    No trend activity recorded in this period.
                  </td>
                </tr>
              ) : (
                trends.slice(-14).map((t) => (
                  <tr key={t.date} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-11">
                    <td className="py-2.5 px-5 font-mono text-[var(--text)]">{t.date}</td>
                    <td className="py-2.5 px-5 text-center tabular-nums">{t.orders}</td>
                    <td className="py-2.5 px-5 text-center tabular-nums font-semibold text-[#0E7490]">{t.pages}</td>
                    <td className="py-2.5 px-5 text-right tabular-nums font-semibold text-[var(--text)]">₹{Number(t.revenue || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Color Distribution */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Layers size={14} strokeWidth={1.75} className="text-[#0E7490]" />
            Color vs B&W Usage
          </h3>
          <div className="space-y-3">
            {breakdowns.colorDistribution?.map((item) => {
              const total = (kpis.period?.totalPagesPrinted || 1)
              const pct = Math.round((item.pages / total) * 100) || 0
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-medium text-[var(--text)] mb-1.5">
                    <span>{item.label}</span>
                    <span className="tabular-nums">{item.pages} pgs ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.label === 'Color' ? 'bg-[#0E7490]' : 'bg-[var(--text)]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Paper Type */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <FileText size={14} strokeWidth={1.75} className="text-[#0E7490]" />
            Paper Type Distribution
          </h3>
          <div className="space-y-1">
            {breakdowns.paperTypeUsage?.map((item) => (
              <div key={item.type} className="flex items-center justify-between text-xs py-2 border-b border-[var(--border)] last:border-0">
                <span className="font-medium text-[var(--text)] capitalize">{item.type.toLowerCase()}</span>
                <span className="tabular-nums font-semibold text-[var(--text)]">{item.pages} pages</span>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Services */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <CheckCircle2 size={14} strokeWidth={1.75} className="text-green-600" />
            Finishing Services
          </h3>
          <div className="space-y-1">
            {breakdowns.serviceUsage && breakdowns.serviceUsage.length > 0 ? (
              breakdowns.serviceUsage.map((item) => (
                <div key={item.service} className="flex items-center justify-between text-xs py-2 border-b border-[var(--border)] last:border-0">
                  <span className="font-medium text-[var(--text)]">{item.service}</span>
                  <span className="tabular-nums font-semibold text-[#0E7490]">{item.count} orders</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-muted)] py-3 text-center">No finishing services ordered in this period.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
