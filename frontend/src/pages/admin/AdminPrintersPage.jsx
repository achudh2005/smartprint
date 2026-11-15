import { useState, useEffect } from 'react'
import {
  Printer,
  RefreshCw,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Store,
} from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function AdminPrintersPage() {
  const [printers, setPrinters] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadPrinters = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/printers')
      setPrinters(res.data.data?.printers || [])
    } catch (err) {
      console.error('Failed to load printers:', err)
      toast.error('Failed to load platform printers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrinters()
  }, [])

  const handleDeletePrinter = async (p) => {
    if (!window.confirm(`Are you sure you want to delete printer "${p.name}" from ${p.shop?.name}?`)) return

    try {
      await api.delete(`/admin/printers/${p.id}`)
      toast.success(`Printer "${p.name}" removed`)
      await loadPrinters()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete printer')
    }
  }

  const filteredPrinters = printers.filter((p) => {
    return (
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.model?.toLowerCase().includes(search.toLowerCase()) ||
      p.shop?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.shop?.shopCode?.toLowerCase().includes(search.toLowerCase())
    )
  })

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase()
    if (s === 'ONLINE') return 'bg-green-500/10 text-green-600 border-green-500/20'
    if (s === 'BUSY' || s === 'PRINTING') return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    return 'bg-red-500/10 text-red-600 border-red-500/20'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Printer className="text-[#0E7490]" size={20} strokeWidth={2} />
            Network Printers & Terminals
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Real-time status and configuration of physical print drivers across all connected shop terminals.
          </p>
        </div>

        <button
          onClick={loadPrinters}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs font-medium rounded-lg shadow-xs transition-colors duration-150"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={14} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search printer name, model, shop code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Printers Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-hover)] text-[var(--text-muted)] border-b border-[var(--border)] uppercase tracking-wider text-[11px] font-semibold sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Printer Name</th>
                <th className="py-2.5 px-4">Tenant Shop</th>
                <th className="py-2.5 px-4">Model & Driver</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Paper & Duplex</th>
                <th className="py-2.5 px-4">Jobs Printed</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
              {filteredPrinters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[var(--text-muted)]">
                    No printers connected or registered.
                  </td>
                </tr>
              ) : (
                filteredPrinters.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 h-12">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-xs text-[var(--text)] flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.isDefault && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#0E7490]/20 text-[#0E7490]">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">{p.connectionType || 'USB/LAN'}</div>
                    </td>
                    <td className="py-2.5 px-4 text-xs">
                      <span className="font-semibold text-[var(--text)]">{p.shop?.name || 'Unassigned'}</span>
                      <span className="block text-[10px] text-[var(--text-muted)] font-mono">{p.shop?.shopCode}</span>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono text-[var(--text-muted)]">
                      {p.model || 'Standard OS Print Queue'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(p.status)}`}>
                        {p.status || 'ONLINE'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[var(--text-muted)]">
                      {p.supportsColor ? 'Color + B&W' : 'Monochrome'} &bull; {p.supportsDuplex ? 'Duplex' : 'Simplex'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs tabular-nums text-[var(--text)]">
                      {p._count?.printJobs || 0} jobs
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleDeletePrinter(p)}
                        title="Delete Printer Configuration"
                        className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-500/15 transition-colors"
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
